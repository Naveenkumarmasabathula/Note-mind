import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '').trim()

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    // ✅ KEY FIX: create client with the user's token as global auth header
    // This makes auth.uid() work correctly in RLS policies
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )

    // Verify the token is valid
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      subject,
      difficulty,
      summary,
      key_points,
      diagram_needed,
      diagram_description,
      revision_questions,
      tags,
      source = 'chatgpt',
      is_manual = false
    } = body

    if (!title || !summary) {
      return NextResponse.json({ error: 'title and summary are required' }, { status: 400 })
    }

    // Look up subject or create it
    let subject_id = null
    if (subject) {
      const { data: existingSubject } = await supabase
        .from('subjects')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', subject)
        .single()

      if (existingSubject) {
        subject_id = existingSubject.id
      } else {
        const colors: Record<string, string> = {
          'Programming': '#6366f1',
          'Mathematics': '#f59e0b',
          'Physics': '#3b82f6',
          'Chemistry': '#10b981',
          'Biology': '#22c55e',
          'History': '#f97316',
          'Economics': '#8b5cf6',
          'General': '#6b7280',
        }
        const { data: newSubject, error: subjectError } = await supabase
          .from('subjects')
          .insert({
            user_id: user.id,
            name: subject,
            color: colors[subject] || '#6366f1',
            note_count: 0
          })
          .select('id')
          .single()

        if (subjectError) {
          console.error('Subject insert error:', subjectError)
          return NextResponse.json({ error: subjectError.message }, { status: 500 })
        }
        subject_id = newSubject?.id
      }
    }

    // Insert note
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        subject_id,
        title,
        summary,
        key_points: key_points || [],
        revision_questions: revision_questions || [],
        difficulty: difficulty || 'easy',
        diagram_needed: diagram_needed || false,
        diagram_description: diagram_description || null,
        source,
        is_manual
      })
      .select()
      .single()

    if (noteError) {
      console.error('Note insert error:', noteError)
      return NextResponse.json({ error: noteError.message }, { status: 500 })
    }

    // Insert tags
    if (tags && tags.length > 0) {
      await supabase
        .from('tags')
        .insert(tags.map((label: string) => ({ note_id: note.id, label })))
    }

    // Increment subject note count
    if (subject_id) {
      await supabase
        .rpc('increment_note_count', { subject_id_input: subject_id })
    }

    return NextResponse.json({ success: true, note_id: note.id })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error.'
    console.error('POST /api/notes error:', message)
    return NextResponse.json({
      error: message
    }, { status: 500 })
  }
}