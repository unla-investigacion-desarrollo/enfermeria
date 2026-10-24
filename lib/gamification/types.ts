export type EarnedBadge = {
  code: string;
  name: string;
};

export type ToastPayload = {
  id: number;
  amount: number;
  badges: EarnedBadge[];
};
