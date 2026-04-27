/**
 * ============================================================================
 * PostList Component - مثال كامل لاستخدام Redux Async Thunks
 * ============================================================================
 */

import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchPosts } from '../store/slices/postsSlice';

/**
 * Post Card Component
 * مثال على component لعرض بطاقة بوست واحد
 */
interface Post {
  id: string;
  author: {
    name: string;
    avatar?: string;
    id?: string;
  };
  content: string;
  image?: string;
  likes: number;
  comments: number;
  createdAt: string;
}

const PostCard: React.FC<{ post: Post }> = ({ post }) => {
  return (
    <div className="bg-white dark:bg-[#262626] rounded-lg p-4 mb-4 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow duration-200">
      {/* Post Header */}
      <div className="flex items-center gap-3 mb-3">
        <img
          src={post.author?.avatar || 'https://ui-avatars.com/api/?name=User'}
          alt={post.author?.name}
          className="w-12 h-12 rounded-full object-cover border-2 border-[#7C3AED]/20"
        />
        <div className="flex-1">
          <h3 className="font-semibold text-[#171717] dark:text-[#F5F5F5]">
            {post.author?.name || 'Unknown User'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(post.createdAt).toLocaleDateString('ar-EG', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>

      {/* Post Content */}
      <p className="text-[#171717] dark:text-[#F5F5F5] mb-3 leading-relaxed">
        {post.content}
      </p>

      {/* Post Image */}
      {post.image && (
        <img
          src={post.image}
          alt="post content"
          className="w-full rounded-lg mb-3 object-cover max-h-96 hover:opacity-90 transition-opacity"
        />
      )}

      {/* Post Actions */}
      <div className="flex gap-4 pt-3 border-t border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 text-sm">
        <button className="flex items-center gap-2 hover:text-[#7C3AED] dark:hover:text-[#8B5CF6] transition-colors group">
          <span className="text-lg group-hover:scale-110 transition-transform">👍</span>
          <span>{post.likes}</span>
        </button>
        <button className="flex items-center gap-2 hover:text-[#7C3AED] dark:hover:text-[#8B5CF6] transition-colors group">
          <span className="text-lg group-hover:scale-110 transition-transform">💬</span>
          <span>{post.comments}</span>
        </button>
        <button className="flex items-center gap-2 hover:text-[#7C3AED] dark:hover:text-[#8B5CF6] transition-colors group ml-auto">
          <span className="text-lg group-hover:scale-110 transition-transform">↗️</span>
          <span>Share</span>
        </button>
      </div>
    </div>
  );
};

/**
 * ============================================================================
 * PostList Component - الـ MAIN COMPONENT
 * ============================================================================
 * 
 * استخدم هذا الـ component مثال لكيفية:
 * 1. Dispatch fetchPosts في useEffect عند تحميل الـ component
 * 2. استخدام useAppSelector للحصول على البيانات من Redux
 * 3. عرض loading state أثناء الـ fetch
 * 4. عرض error state إذا حدث خطأ
 * 5. عرض قائمة البوستات باستخدام .map()
 */
export const PostList: React.FC = () => {\n  const dispatch = useAppDispatch();\n\n  // ✅ Get data من Redux store \n  // استخدم useAppSelector بدل useSelector للحصول على type safety\n  const posts = useAppSelector((state) => state.posts.items);\n  const loading = useAppSelector((state) => state.posts.loading);\n  const error = useAppSelector((state) => state.posts.error);\n  const user = useAppSelector((state) => state.auth.user);\n\n  /**\n   * ✅ Dispatch fetchPosts عند تحميل الـ component\n   * استخدم useEffect مع dependency array [dispatch]\n   * عشان نحط اللـ dispatch مره واحده فقط عند التحميل الأول\n   */\n  useEffect(() => {\n    dispatch(fetchPosts());\n  }, [dispatch]);\n\n  // ============================================================================\n  // LOADING STATE\n  // ============================================================================\n  if (loading && posts.length === 0) {\n    return (\n      <div className=\"flex items-center justify-center min-h-screen\">\n        <div className=\"text-center\">\n          <div className=\"flex justify-center mb-4\">\n            <div className=\"animate-spin rounded-full h-12 w-12 border-b-2 border-[#7C3AED] dark:border-[#8B5CF6]\"></div>\n          </div>\n          <p className=\"text-gray-600 dark:text-gray-400 font-medium\">\n            جاري تحميل البوستات...\n          </p>\n        </div>\n      </div>\n    );\n  }\n\n  // ============================================================================\n  // ERROR STATE\n  // ============================================================================\n  if (error) {\n    return (\n      <div className=\"flex items-center justify-center min-h-screen\">\n        <div className=\"bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md text-center\">\n          <div className=\"text-3xl mb-2\">⚠️</div>\n          <h3 className=\"text-lg font-bold text-red-600 dark:text-red-400 mb-2\">\n            حدث خطأ\n          </h3>\n          <p className=\"text-red-600 dark:text-red-300 text-sm mb-4\">\n            {error}\n          </p>\n          <button\n            onClick={() => dispatch(fetchPosts())}\n            className=\"bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors\"\n          >\n            جرب مرة أخرى\n          </button>\n        </div>\n      </div>\n    );\n  }\n\n  // ============================================================================\n  // EMPTY STATE\n  // ============================================================================\n  if (!loading && posts.length === 0) {\n    return (\n      <div className=\"flex items-center justify-center min-h-screen\">\n        <div className=\"text-center text-gray-500 dark:text-gray-400\">\n          <div className=\"text-5xl mb-4\">📝</div>\n          <p className=\"text-lg font-medium\">ما في بوستات حالياً...</p>\n          <p className=\"text-sm mt-2\">كن أول من يشارك شيء جديد! 🚀</p>\n        </div>\n      </div>\n    );\n  }\n\n  // ============================================================================\n  // SUCCESS STATE - عرض البوستات\n  // ============================================================================\n  return (\n    <div className=\"min-h-screen bg-[#FAFAFA] dark:bg-[#171717] py-6\">\n      <div className=\"max-w-2xl mx-auto px-4\">\n        {/* Header */}\n        <div className=\"mb-8\">\n          <h1 className=\"text-3xl font-bold text-[#171717] dark:text-[#F5F5F5] mb-2\">\n            أهلاً {user?.name}! 👋\n          </h1>\n          <p className=\"text-gray-600 dark:text-gray-400\">\n            {posts.length} بوست\n          </p>\n        </div>\n\n        {/* ✅ KEY PART: تعيين البوستات من Redux Store */}\n        {/* استخدم .map() لـ render كل بوست */}\n        <div className=\"space-y-4\">\n          {posts.map((post: Post) => (\n            <PostCard key={post.id} post={post} />\n          ))}\n        </div>\n\n        {/* Load More Button (اختياري) */}\n        {loading && posts.length > 0 && (\n          <div className=\"flex justify-center mt-8\">\n            <div className=\"text-sm text-gray-500 dark:text-gray-400\">\n              جاري تحميل المزيد...\n            </div>\n          </div>\n        )}\n      </div>\n    </div>\n  );\n};\n\nexport default PostList;\n\n/**\n * ============================================================================\n * استخدام هذا الـ Component\n * ============================================================================\n * \n * في ملف routing أو App.tsx:\n * \n * import PostList from './components/PostList';\n * \n * <Route path=\"/feed\" element={<PostList />} />\n * \n * ============================================================================\n */\n