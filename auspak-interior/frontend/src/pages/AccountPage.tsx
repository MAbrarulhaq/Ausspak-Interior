import { useState } from 'react';
import { Link } from 'react-router-dom';
import DesignCard from '../components/projects/DesignCard';
import { customerApi } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/format';

export default function AccountPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const favs = useAsync(() => customerApi.favourites(page), [page]);
  const notes = useAsync(() => customerApi.notifications(1), []);
  const pages = favs.data
    ? Math.max(1, Math.ceil(favs.data.total / favs.data.page_size))
    : 1;

  return (
    <div className="min-h-screen bg-[#faf9f7] text-[#171717]">

      {/* Account Header */}
      <section className="border-b border-[#eae7e2] bg-[#f4f2ef]">
        <div className="mx-auto max-w-[1600px] px-5 py-12 sm:px-8 lg:px-14 lg:py-16">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <h1 className="font-serif text-4xl tracking-tight sm:text-5xl lg:text-6xl">
                My Account
              </h1>

              <p className="mt-3 text-sm text-[#77716b]">
                <span className="mr-3 text-[#171717]">{user?.full_name}</span>
                <span>·</span>
                <span className="ml-3">{user?.email}</span>
              </p>
            </div>

            

          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="mx-auto max-w-[1600px] px-5 py-10 sm:px-8 lg:px-14 lg:py-14">

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">

          {/* Account Details */}
          <aside className="lg:col-span-4 xl:col-span-4">
            <section className="border border-[#ece9e5] bg-white p-6 shadow-sm sm:p-7">

              <div className="mb-5 flex items-center gap-3 border-b border-[#ece9e5] pb-4">
                <svg
                  className="h-5 w-5 text-[#94712e]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>

                <h2 className="font-serif text-xl font-semibold">
                  Account Details
                </h2>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 bg-[#f4f3f1] px-4 py-4">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[#6c7077]">
                    Full Name
                  </span>
                  <span className="text-sm font-semibold">
                    {user?.full_name || '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 bg-[#f4f3f1] px-4 py-4">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[#6c7077]">
                    Email Address
                  </span>
                  <span className="break-all text-right text-sm">
                    {user?.email || '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 bg-[#f4f3f1] px-4 py-4">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[#6c7077]">
                    Account Status
                  </span>
                  <span className="text-sm">Active</span>
                </div>
              </div>

            </section>
          </aside>

          {/* Right Column */}
          <div className="space-y-6 lg:col-span-8 xl:col-span-8">

            {/* Favourite Designs */}
            <section
              aria-labelledby="fav-title"
              className="border border-[#ece9e5] bg-white p-5 shadow-sm sm:p-6"
            >
              <div className="mb-4 flex items-center justify-between gap-4 border-b border-[#ece9e5] pb-3">
                <div className="flex items-center gap-3">
                  <svg
                    className="h-5 w-5 text-[#94712e]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M6 3h12v18l-6-4-6 4z" />
                  </svg>

                  <h2
                    id="fav-title"
                    className="font-serif text-xl font-semibold sm:text-2xl"
                  >
                    My Favourite Designs
                  </h2>
                </div>

                <Link
                  to="/projects"
                  className="text-[10px] font-semibold uppercase tracking-wider text-[#94712e] transition hover:text-black"
                >
                  Browse All
                </Link>
              </div>

              {favs.loading && !favs.data ? (
                <p role="status" className="py-8 text-center text-sm text-[#77716b]">
                  Loading favourite designs...
                </p>
              ) : favs.error ? (
                <p role="alert" className="py-5 text-sm text-red-600">
                  {favs.error}
                </p>
              ) : favs.data && favs.data.items.length === 0 ? (
                <div className="py-12 text-center">
                  <p
                    className="font-serif text-xl text-[#171717]"
                    data-testid="no-favourites"
                  >
                    No saved designs yet
                  </p>
                  <p className="mt-2 text-sm text-[#77716b]">
                    Discover our bespoke interior collections.
                  </p>
                  <Link
                    to="/projects"
                    className="mt-5 inline-block border-b border-[#94712e] pb-1 text-xs uppercase tracking-wider text-[#94712e]"
                  >
                    Explore Projects
                  </Link>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {favs.data?.items.map((d) => (
                      <DesignCard
                        key={d.id}
                        design={d}
                        height="h-[300px]"
                        onFavouriteChange={(f) => {
                          if (!f) setTimeout(favs.reload, 150);
                        }}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {pages > 1 && (
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#ece9e5] pt-5">
                      <span className="text-xs text-[#77716b]">
                        Page {page} of {pages}
                      </span>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={page <= 1}
                          onClick={() => setPage(page - 1)}
                          className="border border-[#e8e5e0] px-4 py-2 text-xs transition hover:bg-[#f4f2ef] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Previous
                        </button>

                        <button
                          type="button"
                          disabled={page >= pages}
                          onClick={() => setPage(page + 1)}
                          className="border border-[#e8e5e0] px-4 py-2 text-xs transition hover:bg-[#f4f2ef] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* Notifications */}
            <section
              aria-labelledby="notes-title"
              className="border border-[#ece9e5] bg-white p-5 shadow-sm sm:p-6"
            >
              <div className="mb-4 flex items-center justify-between gap-4 border-b border-[#ece9e5] pb-3">
                <div className="flex items-center gap-3">
                  <svg
                    className="h-5 w-5 text-[#94712e]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M18 8a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                    <path d="M10 21h4" />
                  </svg>

                  <h2
                    id="notes-title"
                    className="font-serif text-xl font-semibold sm:text-2xl"
                  >
                    My Order Notifications
                  </h2>
                </div>

                <Link
                  to="/track-order"
                  className="text-[10px] font-semibold uppercase tracking-wider text-[#94712e] transition hover:text-black"
                >
                  Track Order
                </Link>
              </div>

              {notes.data && notes.data.items.length > 0 ? (
                <ul className="space-y-3">
                  {notes.data.items.map((n) => (
                    <li
                      key={n.id}
                      className="border border-[#eeebe7] bg-[#f4f3f1] p-4 sm:p-5"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6c7077]">
                              {n.channel} · {formatDate(n.created_at)}
                            </p>
                          </div>

                          {n.subject && (
                            <h3 className="mt-2 font-serif text-lg leading-snug">
                              {n.subject}
                            </h3>
                          )}

                          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#6c7077]">
                            {n.message}
                          </p>
                        </div>

                        <Link
                          to="/track-order"
                          className="shrink-0 self-start text-xs font-semibold uppercase tracking-wide transition hover:text-[#94712e] sm:self-center"
                        >
                          Track Order →
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="py-10 text-center">
                  <p className="font-serif text-lg">No notifications yet.</p>
                  <p className="mt-2 text-sm leading-6 text-[#77716b]">
                    You can check your order progress whenever you need.
                  </p>
                  <Link
                    to="/track-order"
                    className="mt-4 inline-block border-b border-[#94712e] pb-1 text-xs uppercase tracking-wider text-[#94712e]"
                  >
                    Track an Order
                  </Link>
                </div>
              )}
            </section>

          </div>
        </div>
      </main>
    </div>
    );
}