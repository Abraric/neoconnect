'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import caseService from '@/services/case.service';
import departmentService, { Department } from '@/services/department.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';

const CATEGORIES = ['SAFETY', 'POLICY', 'FACILITIES', 'HR', 'OTHER'] as const;
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;

export default function SubmitCasePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { toast } = useToast();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptError, setDeptError] = useState('');

  const [category, setCategory] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [location, setLocation] = useState('');
  const [severity, setSeverity] = useState('');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState<{ trackingId: string; createdAt: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    departmentService.listDepartments()
      .then(setDepartments)
      .catch(() => setDeptError('Could not load departments. Please contact your administrator.'));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const validate = (): string => {
    if (!category) return 'Please select a category.';
    if (!departmentId) return 'Please select a department.';
    if (!location.trim()) return 'Please enter a location.';
    if (!severity) return 'Please select a severity.';
    if (description.trim().length < 20) return 'Description must be at least 20 characters.';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      const result = await caseService.createCase({
        category,
        departmentId,
        location: location.trim(),
        severity,
        description: description.trim(),
        isAnonymous,
        files: files.length > 0 ? files : undefined,
      });
      setSuccess({ trackingId: result.trackingId, createdAt: result.createdAt });
      toast({ title: 'Case submitted', description: `Your tracking ID is ${result.trackingId}` });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setFormError(axiosErr?.response?.data?.message ?? 'Failed to submit case. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setCategory('');
    setDepartmentId('');
    setLocation('');
    setSeverity('');
    setDescription('');
    setIsAnonymous(false);
    setFiles([]);
    setFormError('');
    setSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-green-600">Case Submitted</CardTitle>
            <CardDescription>Your case has been received and is being reviewed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Tracking ID</p>
              <p className="text-2xl font-bold tracking-widest text-foreground">{success.trackingId}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Save this ID to track your case status.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={() => router.push('/cases')}>View My Cases</Button>
              <Button variant="outline" onClick={handleReset}>Submit Another Case</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Submit a Case</h1>
          <p className="text-muted-foreground mt-1">
            Report an issue or concern. All fields marked * are required.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">

              <div className="space-y-1.5">
                <Label htmlFor="category">Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category…" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="department">Department *</Label>
                {deptError ? (
                  <p className="text-sm text-destructive">{deptError}</p>
                ) : (
                  <Select value={departmentId} onValueChange={setDepartmentId}>
                    <SelectTrigger id="department">
                      <SelectValue placeholder="Select a department…" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  placeholder="e.g. Building A, Floor 3"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="severity">Severity *</Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger id="severity">
                    <SelectValue placeholder="Select severity…" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map(s => (
                      <SelectItem key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">
                  Description * <span className="text-muted-foreground text-xs">(min 20 characters)</span>
                </Label>
                <Textarea
                  id="description"
                  rows={5}
                  placeholder="Describe the issue in detail…"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="resize-y"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {description.length} characters
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="files">Attachments</Label>
                <input
                  ref={fileInputRef}
                  id="files"
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileChange}
                  className="flex w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
                {files.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {files.length} file{files.length > 1 ? 's' : ''} selected
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="anonymous"
                  checked={isAnonymous}
                  onCheckedChange={setIsAnonymous}
                />
                <Label htmlFor="anonymous" className="cursor-pointer font-normal">
                  Submit anonymously
                </Label>
              </div>

              {formError && (
                <Alert variant="destructive">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? 'Submitting…' : 'Submit Case'}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
