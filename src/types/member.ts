/** People who can be assigned to tasks — not the same as clients (customers). */
export type MemberKind = "internal" | "external";

export interface WorkspaceMember {
  id: string;
  name: string;
  email?: string;
  /** Job title / craft, e.g. Designer, Developer */
  role?: string;
  /** internal = studio / you; external = freelancer, agency partner */
  kind?: MemberKind;
  color?: string;
  archived?: boolean;
}

export const DEFAULT_MEMBER_YOU_ID = "mem-you";
