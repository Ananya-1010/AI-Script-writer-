import { badRequest } from '../errors.js'

/**
 * Every inbound request is validated against a schema at the route boundary,
 * before it reaches a controller (spec 5.7). A route without validation is a
 * merge blocker (spec 11.4).
 *
 *   router.post('/scripts', validate({ body: createScriptSchema }), createScript)
 */
export function validate (schemas) {
  return (req, res, next) => {
    for (const part of ['body', 'query', 'params']) {
      const schema = schemas[part]
      if (!schema) continue

      const result = schema.safeParse(req[part])
      if (!result.success) {
        const detail = result.error.issues
          .map((i) => `${i.path.join('.') || part}: ${i.message}`)
          .join('; ')
        return next(badRequest(detail))
      }
      // Use the parsed value: defaults applied, unknown keys stripped.
      req[part] = result.data
    }
    next()
  }
}
