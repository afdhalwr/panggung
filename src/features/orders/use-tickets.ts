"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth-provider";
import { ordersRepository } from "./repository";

export function useTickets() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["tickets", user?.uid],
    queryFn: ordersRepository.listTickets,
    enabled: !!user,
    staleTime: 10_000,
  });
}
