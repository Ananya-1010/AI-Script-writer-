import { Script, Generation } from '../models/index.js'

/**
 * Every panel in one round trip, backed by aggregation, to meet the
 * sub-two-second target (spec 6.7). Six sequential round trips would be the
 * obvious way to build this and would miss the target on a cold connection
 * before the library is even large.
 *
 * The facets run against the same index-backed match, so adding a panel costs
 * almost nothing.
 */
export const dashboardService = {
  async get (userId) {
    const scope = { userId, deletedAt: null }

    const [facets, activity] = await Promise.all([
      Script.aggregate([
        { $match: scope },
        {
          $facet: {
            totals: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
            recent: [
              { $sort: { createdAt: -1 } },
              { $limit: 5 },
              { $project: { _id: 0, scriptId: 1, title: 1, status: 1, platform: '$brief.platform', createdAt: 1 } }
            ],
            recentlyEdited: [
              { $sort: { updatedAt: -1 } },
              { $limit: 5 },
              { $project: { _id: 0, scriptId: 1, title: 1, status: 1, updatedAt: 1 } }
            ],
            byPlatform: [{ $group: { _id: '$brief.platform', count: { $sum: 1 } } }],
            byContentType: [{ $group: { _id: '$brief.contentType', count: { $sum: 1 } } }]
          }
        }
      ]),

      Generation.aggregate([
        { $match: { userId } },
        {
          $facet: {
            daily: [
              { $match: { createdAt: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } } },
              { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, generations: { $sum: 1 } } },
              { $sort: { _id: 1 } }
            ],
            outcomes: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
            // Cost per saved script is the number that matters commercially
            // (spec 12.6), so the raw spend is surfaced rather than buried.
            spend: [{ $group: { _id: null, costUsd: { $sum: '$costUsd' }, tokens: { $sum: { $add: ['$promptTokens', '$completionTokens'] } } } }]
          }
        }
      ])
    ])

    const shaped = facets[0] ?? {}
    const gen = activity[0] ?? {}

    const countBy = (rows = []) =>
      Object.fromEntries(rows.filter((r) => r._id).map((r) => [r._id, r.count]))

    const totals = countBy(shaped.totals)
    const outcomes = countBy(gen.outcomes)
    const attempted = (outcomes.SUCCESS ?? 0) + (outcomes.FAILED ?? 0)

    return {
      totals: {
        scripts: Object.values(totals).reduce((a, b) => a + b, 0),
        drafts: totals.DRAFT ?? 0,
        ready: totals.SCRIPT_READY ?? 0,
        saved: totals.SAVED ?? 0
      },
      recent: shaped.recent ?? [],
      recentlyEdited: shaped.recentlyEdited ?? [],
      breakdown: {
        byPlatform: countBy(shaped.byPlatform),
        byContentType: countBy(shaped.byContentType)
      },
      activity: (gen.daily ?? []).map((d) => ({ date: d._id, generations: d.generations })),
      // Null rather than 1.0 when nothing has run: a perfect score from zero
      // attempts reads as healthy and means nothing.
      generationSuccessRate: attempted ? Number(((outcomes.SUCCESS ?? 0) / attempted).toFixed(2)) : null,
      spend: {
        costUsd: Number((gen.spend?.[0]?.costUsd ?? 0).toFixed(4)),
        tokens: gen.spend?.[0]?.tokens ?? 0
      }
    }
  }
}
