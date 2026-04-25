import { z } from "zod";
import { zPrefixedId } from "@/kernel/id.ts";

export const emailSchema = z.string().email();

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(64),
  slug: z.string().min(3).max(32),
  invites: z.array(emailSchema).max(50).optional(),
});

export const inviteMemberSchema = z.object({
  email: emailSchema,
  roleId: zPrefixedId("workspaceRole").optional(),
});

const workspacePermissionSchema = z.string().min(1).max(64);
const teamPermissionSchema = z.string().min(1).max(64);

export const createRoleSchema = z.object({
  name: z.string().min(1).max(48),
  description: z.string().max(240).nullable().optional(),
  permissions: z.array(workspacePermissionSchema).max(32),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1).max(48).optional(),
  description: z.string().max(240).nullable().optional(),
  permissions: z.array(workspacePermissionSchema).max(32).optional(),
});

export const changeMemberRoleSchema = z.object({
  roleId: zPrefixedId("workspaceRole"),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(10),
});

const teamSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(48)
  .regex(/^[a-z0-9][a-z0-9-]*$/, {
    message: "slug must be lowercase letters, numbers, and hyphens",
  });

export const createTeamSchema = z.object({
  name: z.string().trim().min(1).max(64),
  slug: teamSlugSchema,
  description: z.string().trim().max(280).nullable().optional(),
});

export const updateTeamSchema = z
  .object({
    name: z.string().trim().min(1).max(64).optional(),
    slug: teamSlugSchema.optional(),
    description: z.string().trim().max(280).nullable().optional(),
  })
  .refine(
    (v) =>
      v.name !== undefined ||
      v.slug !== undefined ||
      v.description !== undefined,
    { message: "must include at least one field" },
  );

export const addTeamMemberSchema = z.object({
  workspaceMemberId: zPrefixedId("workspaceMember"),
  roleId: zPrefixedId("teamRole").optional(),
});

export const changeTeamMemberRoleSchema = z.object({
  roleId: zPrefixedId("teamRole"),
});

export const createTeamRoleSchema = z.object({
  name: z.string().trim().min(1).max(48),
  description: z.string().trim().max(240).nullable().optional(),
  permissions: z.array(teamPermissionSchema).max(32),
});

export const updateTeamRoleSchema = z
  .object({
    name: z.string().trim().min(1).max(48).optional(),
    description: z.string().trim().max(240).nullable().optional(),
    permissions: z.array(teamPermissionSchema).max(32).optional(),
  })
  .refine(
    (v) =>
      v.name !== undefined ||
      v.description !== undefined ||
      v.permissions !== undefined,
    { message: "must include at least one field" },
  );

export const startCheckoutSchema = z.object({
  planKey: z.string().trim().min(1).max(64),
  successUrl: z.string().url().max(2048),
  cancelUrl: z.string().url().max(2048),
});

export const openBillingPortalSchema = z.object({
  returnUrl: z.string().url().max(2048),
});

export const cancelSubscriptionSchema = z.object({
  atPeriodEnd: z.boolean().default(true),
});

export const teamSizeSchema = z.enum(["just-me", "2-5", "6-12", "13-plus"]);

export const joinWaitlistSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: emailSchema.max(254),
  teamName: z.string().trim().min(1).max(120),
  teamSize: teamSizeSchema,
  whyOrbit: z.string().trim().max(2000).optional(),
});

export const acceptWaitlistEntrySchema = z.object({
  email: emailSchema.max(254),
});

export const submitOnboardingIntentSchema = z.object({
  ownerName: z.string().trim().min(1).max(120),
  workspaceName: z.string().trim().min(1).max(120),
  workspaceSlug: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/, {
      message: "slug must be lowercase letters, numbers, and hyphens",
    }),
  invitedEmails: z.array(emailSchema.max(254)).max(50).default([]),
});
