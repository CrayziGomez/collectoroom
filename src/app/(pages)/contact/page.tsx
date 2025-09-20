
'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Loader2 } from "lucide-react";

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleSendMessage = async () => {
    if (!name || !email || !subject || !message) {
      toast({
        title: "Missing Information",
        description: "Please fill out all fields before sending.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSending(true);
    try {
      await addDoc(collection(db, "contactSubmissions"), {
        name,
        email,
        subject,
        message,
        submittedAt: serverTimestamp(),
        isRead: false,
      });

      toast({
        title: "Message Sent!",
        description: "Thank you for your feedback. We'll get back to you soon.",
      });

      // Clear form
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');

    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };


  return (
    <div className="container py-12">
        <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold font-headline">Contact Us</h1>
                <p className="text-lg text-muted-foreground mt-2">Have a question or feedback? Drop us a line!</p>
            </div>
            <Card>
                <CardContent className="p-6 grid gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} disabled={isSending} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} disabled={isSending} />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input id="subject" placeholder="What is your message about?" value={subject} onChange={e => setSubject(e.target.value)} disabled={isSending} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="message">Message</Label>
                        <Textarea id="message" placeholder="Your message..." className="min-h-[150px]" value={message} onChange={e => setMessage(e.target.value)} disabled={isSending} />
                    </div>
                    <Button onClick={handleSendMessage} className="w-full" disabled={isSending}>
                      {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isSending ? 'Sending...' : 'Send Message'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
