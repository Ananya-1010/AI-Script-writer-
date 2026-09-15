import { notFound } from '../errors.js'

/**
 * Tenant isolation, enforced in one layer.
 *
 * Every method here takes `userId` as its first argument and folds it into the
 * query itself. A controller cannot forget it, because there is no method that
 * accepts a filter without one (spec 5.1, 9.2).
 *
 * The alternative — remembering `{ userId }` in every controller — fails the
 * first time someone adds a route in a hurry, and it fails silently, by leaking
 * another creator's data rather than by throwing.
 */
export function createScopedRepository (Model, { idField, softDelete = false } = {}) {
  if (!idField) throw new Error('createScopedRepository requires an idField')

  /** Every query starts here. There is no path to the collection that bypasses it. */
  const scope = (userId, extra = {}) => {
    if (!userId) {
      // A programming error, not a user error: fail loudly rather than
      // returning an unscoped query that would read the whole collection.
      throw new Error(`${Model.modelName} repository called without a userId`)
    }
    return softDelete
      ? { userId, deletedAt: null, ...extra }
      : { userId, ...extra }
  }

  return {
    scope,

    async create (userId, doc) {
      const created = await Model.create({ ...doc, userId })
      return created.toObject()
    },

    async findById (userId, id) {
      return Model.findOne(scope(userId, { [idField]: id })).lean()
    },

    /**
     * Cross-tenant access returns 404, never 403: the API must not confirm that
     * another creator's resource exists (spec 9.2). Callers that need the
     * document use this instead of hand-rolling the same check.
     */
    async findByIdOrFail (userId, id) {
      const found = await this.findById(userId, id)
      if (!found) throw notFound('Not found.')
      return found
    },

    async findOne (userId, filter = {}) {
      return Model.findOne(scope(userId, filter)).lean()
    },

    async list (userId, { filter = {}, sort = { updatedAt: -1 }, page = 1, limit = 20 } = {}) {
      const query = scope(userId, filter)
      const safeLimit = Math.min(Math.max(limit, 1), 100)
      const skip = (Math.max(page, 1) - 1) * safeLimit

      const [items, total] = await Promise.all([
        Model.find(query).sort(sort).skip(skip).limit(safeLimit).lean(),
        Model.countDocuments(query)
      ])

      return { items, page, limit: safeLimit, total }
    },

    async update (userId, id, patch) {
      const updated = await Model.findOneAndUpdate(
        scope(userId, { [idField]: id }),
        patch,
        { new: true, runValidators: true }
      ).lean()
      if (!updated) throw notFound('Not found.')
      return updated
    },

    async upsert (userId, patch) {
      return Model.findOneAndUpdate(
        { userId },
        { $set: { ...patch, userId } },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
      ).lean()
    },

    /**
     * Soft delete where the model supports it: removing one bad script must not
     * punch a hole in the evaluation dataset (spec 7.4).
     */
    async remove (userId, id) {
      const filter = scope(userId, { [idField]: id })
      const result = softDelete
        ? await Model.findOneAndUpdate(filter, { deletedAt: new Date() }).lean()
        : await Model.findOneAndDelete(filter).lean()
      if (!result) throw notFound('Not found.')
    },

    async count (userId, filter = {}) {
      return Model.countDocuments(scope(userId, filter))
    },

    /**
     * Aggregation with the tenant match forced in as the first stage, so an
     * index-backed pipeline still cannot read across creators.
     */
    async aggregate (userId, stages = []) {
      return Model.aggregate([{ $match: scope(userId) }, ...stages])
    }
  }
}
