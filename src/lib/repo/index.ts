import { supabaseConfigured } from "../supabase/server";
import { demoRepo } from "./demo";
import { supabaseRepo } from "./supabase";
import type { Repo } from "./types";

export const repo: Repo = supabaseConfigured ? supabaseRepo : demoRepo;
export * from "./types";
