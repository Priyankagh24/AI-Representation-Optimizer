import { Layout } from "@/components/layout";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useCreateAnalysis } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Store, FileText, Link2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useWatch } from "react-hook-form";

const formSchema = z.object({
  storeName: z.string().min(2, "Store name must be at least 2 characters."),
  storeUrl: z.string().url("Please enter a valid URL.").optional().or(z.literal("")),
  category: z.string().optional().or(z.literal("")),
  merchantIntent: z.string().optional().or(z.literal("")),
  storeDescription: z.string().optional().or(z.literal("")),
  productSamples: z.string().optional().or(z.literal("")),
  shippingPolicy: z.string().optional().or(z.literal("")),
  returnPolicy: z.string().optional().or(z.literal("")),
  faqContent: z.string().optional().or(z.literal("")),
  aboutContent: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

function DataCompletenessBar({ values }: { values: FormValues }) {
  const fields: (keyof FormValues)[] = [
    "storeDescription", "productSamples", "aboutContent",
    "faqContent", "shippingPolicy", "returnPolicy", "merchantIntent",
  ];
  const filled = fields.filter((f) => values[f] && String(values[f]).trim().length > 20).length;
  const pct = Math.round((filled / fields.length) * 100);
  const color = pct >= 70 ? "text-emerald-600" : pct >= 40 ? "text-amber-600" : "text-red-500";
  const label = pct >= 70 ? "Good data coverage" : pct >= 40 ? "Moderate — add more for accuracy" : "Low data — results may be generic";

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border bg-muted/30">
      <div className="flex-1 space-y-1">
        <div className="flex justify-between text-xs font-medium">
          <span className="text-muted-foreground">Data Completeness</span>
          <span className={color}>{filled}/{fields.length} fields — {label}</span>
        </div>
        <Progress value={pct} className="h-1.5" />
      </div>
      {pct < 40 && (
        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
      )}
      {pct >= 70 && (
        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
      )}
    </div>
  );
}

export default function NewAudit() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createAnalysis = useCreateAnalysis();
  const [isImporting, setIsImporting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      storeName: "", storeUrl: "", category: "", merchantIntent: "",
      storeDescription: "", productSamples: "", shippingPolicy: "",
      returnPolicy: "", faqContent: "", aboutContent: "",
    },
  });

  const watchedValues = useWatch({ control: form.control });

  async function handleUrlImport() {
    const url = form.getValues("storeUrl");
    if (!url) {
      toast({ variant: "destructive", title: "Enter a URL first", description: "Fill in the Store URL field before importing." });
      return;
    }
    setIsImporting(true);
    try {
      const res = await fetch("/api/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Import failed");
      }
      const data = await res.json();
      if (data.text) {
        // Pre-fill store description with extracted text (first 1500 chars)
        const existing = form.getValues("storeDescription");
        if (!existing || existing.trim().length === 0) {
          form.setValue("storeDescription", data.text.slice(0, 1500));
        }
        if (data.title && !form.getValues("storeName")) {
          form.setValue("storeName", data.title);
        }
        toast({
          title: "URL imported successfully",
          description: "Store description pre-filled from your website. Review and edit as needed.",
        });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Import failed", description: err.message || "Could not fetch that URL." });
    } finally {
      setIsImporting(false);
    }
  }

  function onSubmit(values: FormValues) {
    const payload = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, v === "" ? undefined : v])
    );
    createAnalysis.mutate({ data: payload as any }, {
      onSuccess: (data) => {
        toast({ title: "Audit started", description: "Your store is being analyzed." });
        setLocation(`/audit/${data.id}`);
      },
      onError: (error: any) => {
        // Handle duplicate in-progress audit
        if (error.existingId) {
          toast({ title: "Audit in progress", description: "Redirecting to the existing audit..." });
          setLocation(`/audit/${error.existingId}`);
          return;
        }
        toast({ variant: "destructive", title: "Failed to start audit", description: error.error || "There was a problem submitting your data." });
      },
    });
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">New Audit</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Provide your store data to generate an AI representation diagnostic.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* Completeness bar */}
            <DataCompletenessBar values={watchedValues as FormValues} />

            {/* Store identity */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Store className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">Store Identity</CardTitle>
                    <CardDescription className="text-xs mt-0.5">Basic information about your store</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField control={form.control} name="storeName" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Store Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input placeholder="e.g. Acme Coffee Roasters" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="storeUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Store URL</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input placeholder="https://example.myshopify.com" {...field} />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleUrlImport}
                          disabled={isImporting}
                          className="shrink-0 text-xs px-3"
                        >
                          {isImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Link2 className="h-3.5 w-3.5 mr-1" />Import</>}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription className="text-xs">Paste URL and click Import to auto-fill store content</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Category</FormLabel>
                    <FormControl><Input placeholder="e.g. Specialty Coffee, Eco Home Goods" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="merchantIntent" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-sm font-medium">Target Perception</FormLabel>
                    <FormDescription className="text-xs">How do you want AI agents to describe your brand?</FormDescription>
                    <FormControl>
                      <Textarea
                        placeholder="We want to be known as the most sustainable, high-end specialty coffee roaster in the Pacific Northwest..."
                        className="min-h-[90px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            {/* Store Content */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">Store Content</CardTitle>
                    <CardDescription className="text-xs mt-0.5">Paste raw text from your store — more content = more accurate audit</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <FormField control={form.control} name="storeDescription" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Store Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Paste your main store description or homepage text here..." className="min-h-[100px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="productSamples" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Product Samples</FormLabel>
                    <FormDescription className="text-xs">Paste 2–3 sample product titles and descriptions</FormDescription>
                    <FormControl>
                      <Textarea placeholder={"Product 1: Single Origin Ethiopia Yirgacheffe\n250g bag, naturally processed...\n\nProduct 2: ..."} className="min-h-[150px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField control={form.control} name="aboutContent" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">About Us</FormLabel>
                      <FormControl><Textarea placeholder="Paste your About page text..." className="min-h-[120px]" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="faqContent" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">FAQ Content</FormLabel>
                      <FormControl><Textarea placeholder="Q: Do you ship internationally?&#10;A: Yes, we ship to..." className="min-h-[120px]" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="shippingPolicy" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Shipping Policy</FormLabel>
                      <FormControl><Textarea placeholder="Free shipping on orders over $X..." className="min-h-[100px]" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="returnPolicy" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Return Policy</FormLabel>
                      <FormControl><Textarea placeholder="30-day returns on all unused items..." className="min-h-[100px]" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setLocation("/dashboard")} disabled={createAnalysis.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={createAnalysis.isPending} className="min-w-[160px] font-medium">
                {createAnalysis.isPending
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting Audit...</>
                  : "Run Audit"
                }
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Layout>
  );
}
