import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status });
}

export function apiError(
  message: string,
  status: number,
  code: ApiErrorCode = "INTERNAL_ERROR",
  details?: unknown,
) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
    },
    { status },
  );
}
