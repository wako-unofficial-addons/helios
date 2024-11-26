export interface TorboxUserDataDto {
  status: 'success' | 'error';
  data?: {
    id: string;
    username: string;
    email: string;
    role: string;
    created_at: string;
    updated_at: string;
    subscription: {
      active: boolean;
      expires_at: string | null;
    };
    storage: {
      used: number;
      total: number;
    };
  };
  error?: {
    message: string;
  };
}
