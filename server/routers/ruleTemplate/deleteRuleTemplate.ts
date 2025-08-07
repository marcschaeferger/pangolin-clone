import { z } from "zod";
import { db } from "@server/db";
import { ruleTemplates, templateRules, resourceTemplates } from "@server/db";
import { eq, and } from "drizzle-orm";
import { OpenAPITags } from "@server/openApi";
import { generateId } from "@server/auth/sessions/app";

const deleteRuleTemplateSchema = z.object({
    orgId: z.string().min(1),
    templateId: z.string().min(1)
});

export async function deleteRuleTemplate(req: any, res: any) {
    try {
        const { orgId, templateId } = deleteRuleTemplateSchema.parse({
            orgId: req.params.orgId,
            templateId: req.params.templateId
        });

        // Check if template exists and belongs to the organization
        const existingTemplate = await db
            .select()
            .from(ruleTemplates)
            .where(and(eq(ruleTemplates.orgId, orgId), eq(ruleTemplates.templateId, templateId)))
            .limit(1);

        if (existingTemplate.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Rule template not found"
            });
        }

        // Delete template rules first (due to foreign key constraint)
        await db
            .delete(templateRules)
            .where(eq(templateRules.templateId, templateId));

        // Delete resource template assignments
        await db
            .delete(resourceTemplates)
            .where(eq(resourceTemplates.templateId, templateId));

        // Delete the template
        await db
            .delete(ruleTemplates)
            .where(and(eq(ruleTemplates.orgId, orgId), eq(ruleTemplates.templateId, templateId)));

        return res.status(200).json({
            success: true,
            message: "Rule template deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting rule template:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}
