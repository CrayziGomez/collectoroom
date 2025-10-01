'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { runStorageTest } from '@/app/actions/storage-test';
import Link from 'next/link';

export default function StorageTestPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleRunTest = async () => {
    setIsLoading(true);
    setLogs([]);
    const resultLogs = await runStorageTest();
    setLogs(resultLogs);
    setIsLoading(false);
  };

  return (
    <div className="container py-8 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Firebase Storage Upload Test</CardTitle>
          <CardDescription>
            This page helps diagnose issues with server-side file uploads to Firebase Storage.
            Click the button to run a test that attempts to upload a small text file using the Admin SDK.
            The logs will show which step of the process is failing.
            Go to the <Link href="/admin" className="underline text-primary">Admin page</Link>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleRunTest} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Run Upload Test
          </Button>

          {logs.length > 0 && (
            <div className="p-4 bg-muted rounded-md font-mono text-xs space-y-2 overflow-x-auto">
              {logs.map((log, index) => {
                let colorClass = 'text-foreground';
                if (log.startsWith('[SUCCESS]')) colorClass = 'text-green-500';
                if (log.startsWith('[FAIL]')) colorClass = 'text-red-500';
                if (log.startsWith('[INFO]')) colorClass = 'text-blue-500';

                return (
                  <p key={index} className={colorClass}>
                    {log}
                  </p>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
