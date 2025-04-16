import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').required(),
  PORT: Joi.number().default(3000),

  DATABASE_URL: Joi.string().uri().required(),
  DB_USE_SSL: Joi.string().valid('true', 'false').default('false'),
});
