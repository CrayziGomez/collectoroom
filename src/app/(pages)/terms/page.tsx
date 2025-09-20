
'use client';

import { useState, useEffect } from 'react';

export default function TermsPage() {
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    // This ensures the date is only generated on the client-side after hydration, preventing mismatches.
    setLastUpdated(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
  }, []);

  return (
    <div className="container max-w-3xl py-12">
      <div className="space-y-12">
        <div>
          <h1 className="text-4xl font-bold font-headline">Terms and Conditions</h1>
          {lastUpdated && <p className="text-muted-foreground mt-2">Last updated: {lastUpdated}</p>}
        </div>
        <div className="prose dark:prose-invert max-w-none text-foreground/80 space-y-4">
          <h2 className="text-2xl font-semibold">1. Introduction</h2>
          <p>
            Welcome to CollectoRoom ("Company", "we", "our", "us")! These Terms and Conditions govern your use of our website located at collectoroom.com (together or individually "Service") operated by CollectoRoom. Our Privacy Policy also governs your use of our Service and explains how we collect, safeguard and disclose information that results from your use of our web pages.
          </p>

          <h2 className="text-2xl font-semibold">2. User Content</h2>
          <p>
            You are responsible for the content that you post on or through the Service, including its legality, reliability, and appropriateness. By posting content, you grant us the right and license to use, modify, publicly perform, publicly display, reproduce, and distribute such content on and through the Service. You retain any and all of your rights to any content you submit, post or display on or through the Service and you are responsible for protecting those rights.
          </p>

          <h2 className="text-2xl font-semibold">3. Prohibited Uses</h2>
          <p>
            You may use the Service only for lawful purposes and in accordance with our Terms. You agree not to use the Service in any way that violates any applicable national or international law or regulation. You also agree not to upload any content that is illegal, infringes on any third party's rights of publicity or privacy, or is defamatory, obscene, or harassing.
          </p>

          <h2 id="privacy" className="text-2xl font-semibold pt-8">4. Privacy Policy &amp; GDPR</h2>
          <p>
            Our Privacy Policy describes our policies and procedures on the collection, use and disclosure of your personal information when you use the Service and tells you about your privacy rights and how the law protects you.
          </p>
          <p>
            <strong>Data Collection:</strong> We collect information you provide directly to us, such as when you create an account (email, username, password). We also collect information automatically when you use the service, such as your IP address and usage data.
          </p>
           <p>
            <strong>Data Use:</strong> We use your data to provide and improve the Service, manage your account, process transactions, and communicate with you about your account or our services.
          </p>
          <p>
            <strong>GDPR Rights:</strong> If you are a resident of the European Economic Area (EEA), you have certain data protection rights under the General Data Protection Regulation (GDPR). We aim to take reasonable steps to allow you to correct, amend, delete, or limit the use of your Personal Data. These rights include:
          </p>
          <ul>
            <li>The right to access, update or delete the information we have on you.</li>
            <li>The right of rectification if that information is inaccurate or incomplete.</li>
            <li>The right to object to our processing of your Personal Data.</li>
            <li>The right of restriction of processing of your personal information.</li>
            <li>The right to data portability for the information you provide to us.</li>
            <li>The right to withdraw consent at any time where we relied on your consent to process your personal information.</li>
          </ul>

          <h2 className="text-2xl font-semibold">5. Termination</h2>
          <p>
            We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of these Terms.
          </p>

          <h2 className="text-2xl font-semibold">6. Contact Us</h2>
          <p>
            If you have any questions about these Terms, please contact us at our placeholder email: contact@collectoroom.com.
          </p>
        </div>
      </div>
    </div>
  );
}
