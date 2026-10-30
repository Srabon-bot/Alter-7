import { z } from 'zod';

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const timeStr = z.string().regex(/^\d{2}:\d{2}$/).or(z.literal(''));

export const registerSchema = z.object({
  body: z
    .object({
      email: z.string().email(),
      password: z.string().min(8).max(128),
      name: z.string().min(1).max(80),
      timezone: z.string().min(1).max(64).optional(),
    })
    .strict(),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const loginSchema = z.object({
  body: z
    .object({
      email: z.string().email(),
      password: z.string().min(1),
    })
    .strict(),
});

export const habitCreateSchema = z.object({
  body: z
    .object({
      name: z.string().min(1).max(80),
      description: z.string().max(400).optional(),
      type: z.enum(['boolean', 'numeric']).optional(),
      target: z.number().optional(),
      unit: z.string().max(32).optional(),
      weight: z.number().int().min(1).max(5).optional(),
      targetTime: timeStr.optional(),
      window: z.enum(['morning', 'evening']).optional(),
      core: z.boolean().optional(),
      order: z.number().int().optional(),
    })
    .strict(),
});

export const habitPatchSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z
    .object({
      name: z.string().min(1).max(80).optional(),
      description: z.string().max(400).optional(),
      type: z.enum(['boolean', 'numeric']).optional(),
      target: z.number().optional(),
      unit: z.string().max(32).optional(),
      weight: z.number().int().min(1).max(5).optional(),
      targetTime: timeStr.optional(),
      window: z.enum(['morning', 'evening']).optional(),
      core: z.boolean().optional(),
      active: z.boolean().optional(),
      order: z.number().int().optional(),
      archived: z.boolean().optional(),
    })
    .strict(),
});

export const habitIdSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const daysQuerySchema = z.object({
  query: z
    .object({
      from: dateStr.optional(),
      to: dateStr.optional(),
    })
    .strict(),
});

export const dayDateSchema = z.object({
  params: z.object({ date: dateStr }),
});

const entrySchema = z
  .object({
    habitId: z.string().min(1),
    done: z.boolean().optional(),
    value: z.number().nullable().optional(),
  })
  .strict();

export const eveningSchema = z.object({
  params: z.object({ date: dateStr }),
  body: z
    .object({
      entries: z.array(entrySchema).default([]),
      mood: z.number().int().min(1).max(5).nullable().optional(),
      energy: z.number().int().min(1).max(5).nullable().optional(),
      note: z.string().max(2000).optional(),
    })
    .strict(),
});

export const morningSchema = z.object({
  params: z.object({ date: dateStr }),
  body: z
    .object({
      entries: z.array(entrySchema).default([]),
    })
    .strict(),
});
