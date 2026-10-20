
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import ClubApprovalButton from "@/components/ClubApprovalButton";

export default async function AdminClubsPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Admin-only access check
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/dashboard");

  // Applications awaiting review
  const { data: pendingClubs, error: pendingError } = await supabase
    .from("clubs")
    .select(
      "id, club_name, state, district, address, experience_level, description, contact_email, created_at"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  // Most recent approved or rejected applications
  const { data: decidedClubs, error: decidedError } = await supabase
    .from("clubs")
    .select("id, club_name, state, district, status, created_at")
    .in("status", ["approved", "rejected"])
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-red-600"
          >
            ← Back to Dashboard
          </Link>

          <h1 className="text-3xl font-bold text-gray-900 mt-4">
            Club Registrations
          </h1>

          <p className="text-gray-500 mt-1">
            Review club applications and manage their approval status.
          </p>
        </div>

        {/* Pending applications */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Pending Review
            <span className="ml-2 text-sm font-medium bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
              {pendingClubs?.length ?? 0}
            </span>
          </h2>

          {pendingError ? (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-5">
              Could not load pending registrations. Check your Supabase
              permissions and try again.
            </div>
          ) : !pendingClubs || pendingClubs.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <p className="text-gray-700 font-medium">
                No pending club applications
              </p>
              <p className="text-gray-500 text-sm mt-1">
                You&apos;re all caught up!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {pendingClubs.map((club) => (
                <article
                  key={club.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {club.club_name}
                      </h3>

                      <p className="text-sm text-gray-500 mt-1">
                        📍{" "}
                        {[club.district, club.state]
                          .filter(Boolean)
                          .join(", ")}
                      </p>

                      {club.address && (
                        <p className="text-sm text-gray-500 mt-1">
                          Address: {club.address}
                        </p>
                      )}

                      <p className="text-sm text-gray-500 mt-2">
                        Experience level: {club.experience_level}
                      </p>

                      {club.contact_email && (
                        <p className="text-sm text-gray-500 mt-1">
                          Contact:{" "}
                          <a
                            href={`mailto:${club.contact_email}`}
                            className="text-red-600 hover:underline"
                          >
                            {club.contact_email}
                          </a>
                        </p>
                      )}

                      {club.description && (
                        <p className="text-sm text-gray-600 mt-3 whitespace-pre-wrap">
                          {club.description}
                        </p>
                      )}

                      <p className="text-xs text-gray-400 mt-3">
                        Submitted:{" "}
                        {new Date(club.created_at).toLocaleDateString(
                          "en-MY",
                          {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          }
                        )}
                      </p>
                    </div>

                    <ClubApprovalButton
                      clubId={club.id}
                      currentStatus="pending"
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Recent decisions */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Decisions
          </h2>

          {decidedError ? (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-5">
              Could not load recent decisions.
            </div>
          ) : !decidedClubs || decidedClubs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-gray-500 text-sm">
              No approved or rejected registrations yet.
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
              {decidedClubs.map((club) => (
                <div
                  key={club.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {club.club_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {[club.district, club.state]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>

                  <ClubApprovalButton
                    clubId={club.id}
                    currentStatus={club.status}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
