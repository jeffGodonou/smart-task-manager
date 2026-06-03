import {z} from 'zod';

//validation shema for tasks
export const taskSchema = z.object({
    title: z
        .string()
        .min(1, 'Title is required')
        .max(100, 'Title must be under 100 characters'),
    description: z
        .string()
        .max(500, 'Description must be under 500 characters')
        .optional(),
    dueDate: z
        .string()
        .refine(val => !val || new Date(val) >= new Date(), {
            message: 'Due date cannot be in the past',
        })
        .optional(),
})

export type TaskFormData = z.infer<typeof taskSchema>;
