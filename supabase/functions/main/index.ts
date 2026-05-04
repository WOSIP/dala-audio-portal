import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://lhcwliyrlpdrksrzwcbw.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const FETCH_TIMEOUT_MS = 360000;
const MAX_RETRIES = 5;
const INITIAL_BACKOFF = 1000;

const customFetch = async (
  url: string | URL | Request,
  options: RequestInit = {},
  attempt: number = 1
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok && (response.status >= 500 || response.status === 429) && attempt < MAX_RETRIES) {
      throw new Error(`Upstream Server Error (${response.status})`);
    }

    return response;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error(`Database request timed out after ${FETCH_TIMEOUT_MS / 1000}s`);
      if (attempt >= MAX_RETRIES) throw timeoutError;
    } else if (attempt >= MAX_RETRIES) {
      throw error;
    }

    const delay = INITIAL_BACKOFF * Math.pow(2, attempt - 1);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return customFetch(url, options, attempt + 1);
  } finally {
    clearTimeout(timeoutId);
  }
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  global: {
    fetch: customFetch,
  },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
    }

    const { data, error } = await supabase
      .from("albums")
      .select("*")
      .limit(10);

    if (error) throw error;

    return new Response(
      JSON.stringify({ status: "success", data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ status: "error", message: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});