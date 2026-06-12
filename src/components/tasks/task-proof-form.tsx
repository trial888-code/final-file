"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { submitTaskForReview } from "@/lib/actions/daily-tasks";
import { uploadTaskProofImage } from "@/lib/tasks/proof-upload";
import { getAttachmentType, resolveFileMimeType } from "@/lib/chat/attachments";
import { toast } from "sonner";

interface TaskProofFormProps {
  taskId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TaskProofForm({ taskId, onSuccess, onCancel }: TaskProofFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [proof, setProof] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function clearFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (getAttachmentType(file) !== "image") {
      toast.error("Please upload an image (JPG, PNG, GIF, or WebP).");
      e.target.value = "";
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit() {
    const note = proof.trim();
    const link = proofUrl.trim();

    if (!note && !link && !pendingFile) {
      toast.error("Add a note, link, or upload a screenshot as proof.");
      return;
    }

    setLoading(true);

    let storedProofUrl = link || undefined;

    if (pendingFile) {
      const supabase = createClient();
      if (!supabase) {
        toast.error("Authentication is not configured");
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please sign in to submit proof");
        setLoading(false);
        return;
      }

      const upload = await uploadTaskProofImage(supabase, user.id, pendingFile);
      if ("error" in upload) {
        toast.error(upload.error);
        setLoading(false);
        return;
      }
      storedProofUrl = upload.path;
    }

    const result = await submitTaskForReview(taskId, note, storedProofUrl);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Submitted! Admin will review within 24 hours.");
    clearFile();
    setProof("");
    setProofUrl("");
    onSuccess();
  }

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-white/10 bg-[#1a1a1a] p-3">
      <Textarea
        value={proof}
        onChange={(e) => setProof(e.target.value)}
        placeholder="Describe what you did (username, date, platform)..."
        rows={3}
        className="text-sm bg-[#121212] border-white/10 resize-none"
      />
      <Input
        value={proofUrl}
        onChange={(e) => setProofUrl(e.target.value)}
        placeholder="Optional: link to post or screenshot URL"
        className="text-sm bg-[#121212] border-white/10"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />

      {pendingFile && previewUrl && (
        <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-[#121212] p-2">
          <div className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden border border-white/10">
            <Image
              src={previewUrl}
              alt="Proof preview"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-xs font-medium truncate">{pendingFile.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {(pendingFile.size / 1024).toFixed(0)} KB ·{" "}
              {resolveFileMimeType(pendingFile).replace("image/", "").toUpperCase()}
            </p>
          </div>
          <button
            type="button"
            onClick={clearFile}
            className="p-1 rounded-md hover:bg-white/10 text-muted-foreground"
            aria-label="Remove image"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full gap-2 text-xs"
        onClick={() => fileInputRef.current?.click()}
        disabled={loading}
      >
        <ImagePlus className="h-4 w-4" />
        {pendingFile ? "Change screenshot" : "Upload screenshot"}
      </Button>

      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={handleSubmit} disabled={loading}>
          {loading ? "Submitting..." : "Submit for review"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
