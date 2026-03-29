import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export const useUserRole = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) throw error;
      const roles = data?.map((r: any) => r.role) || [];
      return {
        roles,
        isTeacher: roles.includes("teacher"),
        isAdmin: roles.includes("admin"),
        isStudent: roles.includes("student"),
      };
    },
    enabled: !!user,
  });
};

export const useSwitchRole = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (role: "teacher" | "student") => {
      if (!user) throw new Error("Not authenticated");
      // Add role if not exists
      const { error } = await supabase
        .from("user_roles")
        .upsert({ user_id: user.id, role }, { onConflict: "user_id,role" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-role"] });
    },
  });
};
