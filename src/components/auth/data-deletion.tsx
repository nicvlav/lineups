import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Trash2, Shield } from "lucide-react";
import { PAGE_LAYOUT } from "@/lib/design-tokens/page-tokens";
import { PADDING, PADDING_X, PADDING_Y, SPACING_Y, GAP, RADIUS, SIZES } from "@/lib/design-tokens";
import { cn } from "@/lib/utils/cn";

export default function DataDeletionPage() {
  return (
    <div className={cn("min-h-screen flex items-center justify-center bg-background", PADDING.md)}>
      <div className={cn("w-full max-w-2xl", SPACING_Y.lg)}>
        {/* Header */}
        <div className={cn("text-center", PAGE_LAYOUT.header.wrapper)}>
          <h1 className="text-3xl font-bold tracking-tight">Data Deletion Request</h1>
          <p className={PAGE_LAYOUT.header.description}>
            Request deletion of your account and personal data
          </p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className={cn("mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4", SIZES.button.xl, "w-12")}>
              <Trash2 className={cn(SIZES.icon.md, "text-red-600")} />
            </div>
            <CardTitle>Delete Your Data</CardTitle>
          </CardHeader>
          <CardContent className={SPACING_Y.lg}>
            <div className={SPACING_Y.md}>
              <div className={cn("flex items-start", GAP.sm)}>
                <Shield className={cn(SIZES.icon.sm, "text-blue-600 mt-1")} />
                <div>
                  <h3 className="font-semibold">What data will be deleted?</h3>
                  <ul className={cn("text-sm text-muted-foreground mt-1", SPACING_Y.xs)}>
                    <li>• Your account information and profile</li>
                    <li>• Any votes or ratings you've submitted</li>
                    <li>• Your login credentials and session data</li>
                    <li>• Any personal preferences or settings</li>
                  </ul>
                </div>
              </div>

              <div className={cn("flex items-start", GAP.sm)}>
                <Mail className={cn(SIZES.icon.sm, "text-green-600 mt-1")} />
                <div>
                  <h3 className="font-semibold">How to request deletion</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Send an email to{" "}
                    <a 
                      href="mailto:nicolasvlavianos@gmail.com?subject=Data Deletion Request"
                      className="text-primary hover:underline"
                    >
                      nicolasvlavianos@gmail.com
                    </a>
                    {" "}with the subject "Data Deletion Request" and include:
                  </p>
                  <ul className={cn("text-sm text-muted-foreground mt-1", SPACING_Y.xs)}>
                    <li>• Your email address used for the account</li>
                    <li>• Your full name (if provided)</li>
                    <li>• Confirmation that you want to delete all data</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className={cn("bg-muted", PADDING.md, RADIUS.lg)}>
              <h3 className="font-semibold text-sm">Processing Timeline</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Data deletion requests will be processed within <strong>30 days</strong> of receipt. 
                You will receive a confirmation email once your data has been permanently deleted.
              </p>
            </div>

            <div className={cn("bg-yellow-50 border border-yellow-200", PADDING.md, RADIUS.lg)}>
              <h3 className="font-semibold text-sm text-yellow-800">Important Note</h3>
              <p className="text-sm text-yellow-700 mt-1">
                This action cannot be undone. Once your data is deleted, your account and all 
                associated information will be permanently removed from our systems.
              </p>
            </div>

            <div className="pt-4 border-t">
              <a 
                href="mailto:nicolasvlavianos@gmail.com?subject=Data Deletion Request&body=Hello,%0D%0A%0D%0AI would like to request deletion of my account and all associated data from the Lineups application.%0D%0A%0D%0AAccount email: [Your email here]%0D%0AFull name: [Your name here]%0D%0A%0D%0AI confirm that I want to permanently delete all my data.%0D%0A%0D%0AThank you."
                className={cn("w-full bg-red-600 hover:bg-red-700 text-white font-medium inline-flex items-center justify-center transition-colors", PADDING_Y.xs, PADDING_X.md, RADIUS.lg)}
              >
                <Mail className={cn("mr-2", SIZES.icon.xs)} />
                Send Deletion Request
              </a>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <a 
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to Lineups
          </a>
        </div>
      </div>
    </div>
  );
}