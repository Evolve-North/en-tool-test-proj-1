import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL ?? "";
const ACCESS_CONTROL = process.env.NEXT_PUBLIC_ACCESS_CONTROL ?? "org";
const OWNER_EN_USER_ID = process.env.NEXT_PUBLIC_OWNER_EN_USER_ID ?? "";

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)"],
};

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (items) => {
          for (const { name, value, options } of items) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { data } = await supabase.auth.getUser();
  const user = data.user;

  const path = request.nextUrl.pathname;
  const isAuthPath = path.startsWith("/login") || path.startsWith("/auth");

  if (!user && !isAuthPath) {
    const returnTo = encodeURIComponent(request.nextUrl.toString());
    return NextResponse.redirect(`${PLATFORM_URL}/login?returnTo=${returnTo}`);
  }

  if (user && ACCESS_CONTROL === "owner_only") {
    const userEnId = user.user_metadata?.en_user_id;
    if (userEnId !== OWNER_EN_USER_ID) {
      return new NextResponse("You don't have access to this tool", { status: 403 });
    }
  }

  return response;
}
