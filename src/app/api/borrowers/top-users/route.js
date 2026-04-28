import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

export async function GET() {
  try {
    const data = await sql`
      WITH loan_stats AS (
        SELECT 
          l.user_id,
          COUNT(*) AS total_loans,
          MAX(l.created_at) AS last_loan_date
        FROM loans l
        GROUP BY l.user_id
      ),
      favorite_books AS (
        SELECT 
          l.user_id,
          l.book_id,
          COUNT(*) AS borrow_count,
          ROW_NUMBER() OVER (
            PARTITION BY l.user_id 
            ORDER BY COUNT(*) DESC
          ) AS rn
        FROM loans l
        GROUP BY l.user_id, l.book_id
      )
      SELECT 
        u.id,
        u.nama,
        u.email,
        ls.total_loans,
        ls.last_loan_date,
        b.title AS favorite_book
      FROM loan_stats ls
      JOIN users u ON u.id = ls.user_id
      LEFT JOIN favorite_books fb 
        ON fb.user_id = ls.user_id AND fb.rn = 1
      LEFT JOIN books b ON b.id = fb.book_id
      ORDER BY ls.total_loans DESC
      LIMIT 3;
    `;

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}