import {z} from 'zod';

function toLocalStartOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

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
        .refine(val => {
            if (!val) {
                return true;
            }

            const selectedDate = new Date(`${val}T00:00:00`);
            if (Number.isNaN(selectedDate.getTime())) {
                return false;
            }

            const today = toLocalStartOfDay(new Date());
            return selectedDate >= today;
        }, {
            message: 'Due date cannot be in the past',
        })
        .optional(),
})

export type TaskFormData = z.infer<typeof taskSchema>;
