'use server';

import { signIn } from "@/auth";
import { sql } from "@vercel/postgres";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(['pending', 'paid']),
    date: z.string()
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
    try {
        const { customerId, amount, status } = CreateInvoice.parse(Object.fromEntries(formData.entries()));
        const amountInCents = amount * 100;
        const date = new Date().toISOString().split('T')[0];

        await sql`
            INSERT INTO invoices (customer_id, amount, status, date)
            VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
        `;
        revalidatePath('/dashboard/invoices');
    } catch (error) {
        return {
            message: "Database Error: Failed to save invoice"
        }
    }
    redirect('/dashboard/invoices');
}

const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function updateInvoice(id: string, formData: FormData) {
    try {
        const { customerId, amount, status } = UpdateInvoice.parse(Object.fromEntries(formData.entries()));
        const amountInCents = amount * 100;

        await sql`
            UPDATE invoices
            SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
            WHERE id = ${id}
        `;
        revalidatePath('/dashboard/invoices');
    } catch (error) {
        return {
            message: "Database Error: Failed to update invoice"
        }
    }
    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
    try {
        await sql`DELETE FROM invoices WHERE id = ${id}`;
        revalidatePath('/dashboard/invoices');
        return {
            message: "Successfully deleted invoice"
        }
    } catch (error) {
        return {
            message: "Database Error: Failed to delete invoice"
        }
    }
}

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        await signIn('credentials', formData);
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Invalid credentials.';
                default:
                    return 'Something went wrong.';
            }
        }
        throw error;
    }
}