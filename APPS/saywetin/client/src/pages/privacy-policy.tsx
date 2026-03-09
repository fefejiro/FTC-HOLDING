import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Link href="/">
            <button className="p-2 -ml-2 hover:bg-muted rounded-lg" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <h1 className="text-lg font-semibold">Privacy Policy</h1>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        <Card>
          <CardContent className="pt-6 space-y-6">
            <p className="text-sm text-muted-foreground">
              Last updated: February 3, 2026
            </p>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                Saywetin ("we", "our", or "us") operates the Saywetin mobile application and website. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
                when you use our Service. Please read this policy carefully.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Information We Collect</h2>
              
              <div className="space-y-2">
                <h3 className="font-medium">Audio Data</h3>
                <p className="text-muted-foreground leading-relaxed">
                  When you use the "Listen" feature, Saywetin temporarily records a short audio clip 
                  (approximately 6-10 seconds) to identify the song playing. This audio is sent to 
                  our audio recognition partner (ACRCloud) for processing. We do not permanently 
                  store the raw audio recordings.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">Account Information</h3>
                <p className="text-muted-foreground leading-relaxed">
                  If you create an account, we collect your username, email address, and an encrypted 
                  version of your password. This information is used to provide personalized features 
                  such as your listening history and saved songs.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">Usage Data</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We collect anonymous usage data including songs recognized, features used, and 
                  general app interactions. This helps us improve Saywetin and understand which 
                  features are most valuable to our users.
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">How We Use Your Information</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>To identify songs and provide lyrics and cultural context</li>
                <li>To maintain your listening history and favorites</li>
                <li>To improve our AI-powered translations and cultural insights</li>
                <li>To communicate with you about your account or the Service</li>
                <li>To analyze usage patterns and improve the app experience</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Third-Party Services</h2>
              <p className="text-muted-foreground leading-relaxed">
                Saywetin uses the following third-party services to provide its features:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li><strong>ACRCloud</strong> - For audio fingerprinting and song recognition</li>
                <li><strong>Musixmatch</strong> - For retrieving song lyrics</li>
                <li><strong>OpenAI</strong> - For generating cultural context and translations</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-2">
                Each of these services has their own privacy policies governing how they handle data.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement appropriate technical and organizational security measures to protect 
                your personal information. However, no method of transmission over the Internet 
                or electronic storage is 100% secure.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Children's Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Saywetin is not intended for children under 13 years of age. We do not knowingly 
                collect personal information from children under 13. If you are a parent or guardian 
                and believe your child has provided us with personal information, please contact us.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Your Rights</h2>
              <p className="text-muted-foreground leading-relaxed">
                You may request access to, correction of, or deletion of your personal data at any time. 
                To exercise these rights, please contact us using the information provided below.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Delete Your Data</h2>
              <p className="text-muted-foreground leading-relaxed">
                You have the right to request deletion of all your personal data from Saywetin. 
                This includes your account information, listening history, and any saved content.
              </p>
              <Link href="/delete-data">
                <span className="inline-block mt-2 text-primary underline font-medium cursor-pointer">
                  Request Data Deletion
                </span>
              </Link>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Changes to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes 
                by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about this Privacy Policy or our data practices, please contact 
                us through the Saywetin app or visit our website at saywetin.app.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
