import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  console.log("FUNCTION HIT");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ✅ ambil ENV DI DALAM handler (penting)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("ENV not configured");
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { email, password, fullName, role } = await req.json();

    if (!email || !password || !fullName) {
      throw new Error("Missing required fields");
    }

    // ✅ CREATE AUTH USER
    const { data, error } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

    if (error) throw error;

    const userId = data.user.id;

    // ✅ CREATE PROFILE
    await supabaseAdmin.from("profiles").insert({
      id: userId,
      full_name: fullName,
    });

    // ✅ INSERT ROLE
    await supabaseAdmin.from("user_roles").upsert({
      user_id: userId,
      role: role ?? "student",
    });

    return new Response(
      JSON.stringify({ success: true, userId }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (e) {
    console.error("ERROR:", e);

    return new Response(
      JSON.stringify({ error: String(e.message ?? e) }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});