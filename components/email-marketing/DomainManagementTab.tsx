"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  CheckCircle,
  Globe,
  Trash2,
  RefreshCw,
} from "lucide-react";

interface Domain {
  id: string;
  name: string;
  status: string; // 'unverified' | 'verified' | 'failed'
  dns_records?: any[];
  last_checked?: string;
  created_at: string;
}

export default function DomainManagementTab() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch domains on mount
  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    try {
      const response = await fetch("/api/email/domains");
      const data = await response.json();
      if (data.success) {
        setDomains(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch domains:", err);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!newDomain.trim()) {
      setError("Domain name is required");
      return;
    }

    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(newDomain.trim())) {
      setError("Invalid domain format");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/email/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain.trim() }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccess(`Domain ${newDomain} added successfully`);
        setNewDomain("");
        await fetchDomains();
      } else {
        setError(data.error || "Failed to add domain");
      }
    } catch (err) {
      setError("Network error while adding domain");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch(`/api/email/domains/${domainId}/verify`, {
        method: "POST",
      });

      const data = await response.json();
      if (data.success) {
        setSuccess(data.verified ? "Domain verified!" : "Domain verification pending");
        await fetchDomains();
      } else {
        setError(data.error || "Verification failed");
      }
    } catch (err) {
      setError("Network error during verification");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDomain = async (domainId: string, domainName: string) => {
    if (!confirm(`Are you sure you want to delete domain ${domainName}?`)) {
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch(`/api/email/domains/${domainId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (data.success) {
        setSuccess(`Domain ${domainName} deleted successfully`);
        await fetchDomains();
      } else {
        setError(data.error || "Failed to delete domain");
      }
    } catch (err) {
      setError("Network error while deleting domain");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "failed":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "verified":
        return "Verified";
      case "failed":
        return "Failed";
      default:
        return "Unverified";
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-200">
          <CheckCircle className="w-5 h-5" />
          <span>{success}</span>
        </div>
      )}

      {/* Add Domain Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Add Email Domain
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddDomain} className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="domain">Domain Name</Label>
              <Input
                id="domain"
                type="text"
                placeholder="example.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={loading}>
                {loading ? "Adding..." : "Add Domain"}
              </Button>
            </div>
          </form>
          <p className="text-sm text-muted-foreground mt-2">
            Add a domain to use for sending emails. You'll need to verify DNS records.
          </p>
        </CardContent>
      </Card>

      {/* Domains Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Domains</CardTitle>
        </CardHeader>
        <CardContent>
          {domains.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No domains added yet. Add your first domain above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.map((domain) => (
                  <TableRow key={domain.id}>
                    <TableCell className="font-medium">{domain.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(domain.status)}
                        <span>{getStatusText(domain.status)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(domain.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVerifyDomain(domain.id)}
                          disabled={loading}
                        >
                          <RefreshCw className="w-4 h-4" />
                          Verify
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteDomain(domain.id, domain.name)}
                          disabled={loading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* DNS Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>DNS Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            To verify domain ownership and enable email sending, add these DNS records to your domain:
          </p>
          <div className="bg-muted p-4 rounded-lg space-y-2 text-sm font-mono">
            <div>
              <strong>SPF Record (TXT):</strong>
              <code className="block mt-1 text-xs">v=spf1 include:resend.com ~all</code>
            </div>
            <div>
              <strong>DKIM Record (TXT):</strong>
              <code className="block mt-1 text-xs">Check your email provider for DKIM key</code>
            </div>
            <div>
              <strong>DMARC Record (TXT):</strong>
              <code className="block mt-1 text-xs">v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com</code>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Note: DNS changes can take up to 48 hours to propagate. Click "Verify" to check the status.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
