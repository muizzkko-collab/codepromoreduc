import { getBlogPosts } from '@/app/actions/blog'
import { BlogAdmin } from '@/components/admin/BlogAdmin'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Blog' }

export default async function BlogAdminPage() {
  const { data } = await getBlogPosts(false)
  return <BlogAdmin initialPosts={data ?? []} />
}
