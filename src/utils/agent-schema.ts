import { type ZodType } from 'zod'

/**
 * 转换发给大模型的 JSON Schema，并移除 qwen 不支持的 propertyNames
 */
export function toJSONSchema(schema: ZodType) {
  return schema.toJSONSchema({
    override: ({ jsonSchema }) => {
      delete jsonSchema.propertyNames
    },
  })
}
