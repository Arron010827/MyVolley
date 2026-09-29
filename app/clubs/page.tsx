// app/clubs/page.tsx
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import ClubsMap from "@/components/ClubsMap";
import ClubsBrowser from "@/components/ClubsBrowser";

export default async function ClubsPage() {
  const supabase = await createServerSupabaseClient();

  // Check if user is logged in — we pass this to JoinClubButton
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Fetch all approved clubs
  const { data: clubs, error } = await supabase
    .from("clubs")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Volleyball Clubs
            </h1>
            <p className="text-gray-500 mt-1">
              {clubs?.length ?? 0} approved{" "}
              {clubs?.length === 1 ? "club" : "clubs"} in Malaysia
            </p>
          </div>
          <Link
            href="/clubs/register"
            className="bg-red-600 text-white font-semibold px-6 py-3 rounded-full hover:bg-red-700 hover:shadow-lg hover:scale-105 transition-all duration-200 text-sm"
          >
            + Register Club
          </Link>
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-6">
            {"Something went wrong loading clubs. Please try again."}
          </div>
        )}

        {/* Empty state */}
        {/* {!error && (!clubs || clubs.length === 0) && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="text-5xl mb-4">🏐</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              No clubs yet
            </h2>
            <p className="text-gray-500 mb-6">
              {"Be the first to register a volleyball club in Malaysia!"}
            </p>
            <Link
              href="/clubs/register"
              className="bg-red-600 text-white font-semibold px-8 py-3 rounded-full hover:bg-red-700 transition-colors"
            >
              Register a Club
            </Link>
          </div>
        )} */}

        {/* Map section */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Club Locations</h2>
          <ClubsMap clubs={clubs ?? []} />

          {/* Load Google Maps script */}
          <script
            src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`}
            async
            defer
          />
        </div>

        {/* Browse + Top Picks section */}
        {!error && (!clubs || clubs.length === 0) ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
            <div className="text-5xl mb-4">🏐</div>
            <h2 className="text-xl font-bold mb-2">No clubs yet</h2>
            <p className="text-gray-500 mb-6">
              Be the first to register a volleyball club in Malaysia!
            </p>
            <Link
              href="/clubs/register"
              className="bg-red-600 text-white font-semibold px-8 py-3 rounded-full hover:bg-red-700 transition-colors"
            >
              Register a Club
            </Link>
          </div>
        ) : (
          <ClubsBrowser clubs={clubs ?? []} />
        )}
      </div>
    </div>
  );
}

// Old Clubs grid
// {/* Clubs grid */}
// {clubs && clubs.length > 0 && (
//   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//     {clubs.map((club) => (
//       <div
//         key={club.id}
//         className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:scale-[1.02] transition-all duration-200"
//       >
//         {/* Club card header */}
//         <Link href={`/clubs/${club.id}`}>
//           <div className="bg-gradient-to-br from-red-600 to-red-800 px-6 py-8">
//             <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold text-white mb-3">
//               {club.club_name.charAt(0).toUpperCase()}
//             </div>
//             <h2 className="text-xl font-bold text-white">
//               {club.club_name}
//             </h2>
//             {club.state && (
//               <p className="text-red-200 text-sm mt-1">
//                 📍 {club.state}
//               </p>
//             )}
//           </div>

//           {/* Club card body */}
//           <div className="px-6 py-5">
//             {club.experience_level && (
//               <span
//                 className={`text-xs font-medium px-3 py-1 rounded-full ${EXPERIENCE_COLORS[club.experience_level] ?? "bg-gray-100 text-gray-700"}`}
//               >
//                 {club.experience_level}
//               </span>
//             )}

//             {club.description && (
//               <p className="text-gray-500 text-sm mt-3 line-clamp-3">
//                 {club.description}
//               </p>
//             )}
//           </div>
//         </Link>

//         <div className="px-6 pb-5 space-y-3">
//           {club.contact_email && (
//             <a
//               href={`mailto:${club.contact_email}`}
//               className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 mt-4 font-medium"
//             >
//               ✉️ {club.contact_email}
//             </a>
//           )}

//         </div>
//       </div>
//     ))}
//   </div>
// )}
