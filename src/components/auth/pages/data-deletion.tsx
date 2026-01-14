import { Mail, Shield, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DataDeletionPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-2xl space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Data Deletion Request</h1>
                    <p className="text-muted-foreground">Request deletion of your account and personal data</p>
                </div>

                <Card>
                    <CardHeader className="text-center">
                        <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                            <Trash2 className="h-6 w-6 text-red-600" />
                        </div>
                        <CardTitle>Delete Your Data</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-start space-x-3">
                                <Shield className="h-5 w-5 text-blue-600 mt-1" />
                                <div>
                                    <h3 className="font-semibold">What data will be deleted?</h3>
                                    <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                                        <li>• Your account information and profile</li>
                                        <li>• Any votes or ratings you've submitted</li>
                                        <li>• Your login credentials and session data</li>
                                        <li>• Any personal preferences or settings</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="flex items-start space-x-3">
                                <Mail className="h-5 w-5 text-green-600 mt-1" />
                                <div>
                                    <h3 className="font-semibold">How to request deletion</h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Send an email to{" "}
                                        <a
                                            href="mailto:nicolasvlavianos@gmail.com?subject=Data Deletion Request"
                                            className="text-primary hover:underline"
                                        >
                                            nicolasvlavianos@gmail.com
                                        </a>{" "}
                                        with the subject "Data Deletion Request" and include:
                                    </p>
                                    <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                                        <li>• Your email address used for the account</li>
                                        <li>• Your full name (if provided)</li>
                                        <li>• Confirmation that you want to delete all data</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="bg-muted p-4 rounded-lg">
                            <h3 className="font-semibold text-sm">Processing Timeline</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Data deletion requests will be processed within <strong>30 days</strong> of receipt. You
                                will receive a confirmation email once your data has been permanently deleted.
                            </p>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                            <h3 className="font-semibold text-sm text-yellow-800">Important Note</h3>
                            <p className="text-sm text-yellow-700 mt-1">
                                This action cannot be undone. Once your data is deleted, your account and all associated
                                information will be permanently removed from our systems.
                            </p>
                        </div>

                        <div className="pt-4 border-t">
                            <a
                                href="mailto:nicolasvlavianos@gmail.com?subject=Data Deletion Request&body=Hello,%0D%0A%0D%0AI would like to request deletion of my account and all associated data from the Lineups application.%0D%0A%0D%0AAccount email: [Your email here]%0D%0AFull name: [Your name here]%0D%0A%0D%0AI confirm that I want to permanently delete all my data.%0D%0A%0D%0AThank you."
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg inline-flex items-center justify-center transition-colors"
                            >
                                <Mail className="mr-2 h-4 w-4" />
                                Send Deletion Request
                            </a>
                        </div>
                    </CardContent>
                </Card>

                <div className="text-center">
                    <a href="/" className="text-sm text-muted-foreground hover:text-foreground">
                        ← Back to Lineups
                    </a>
                </div>
            </div>
        </div>
    );
}
