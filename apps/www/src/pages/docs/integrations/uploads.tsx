import {
  DocsCallout,
  DocsCode,
  DocsCodeBlock,
  DocsH2,
  DocsH3,
  DocsLayout,
  DocsList,
  DocsP,
} from "@/components/docs-layout";

export const meta = {
  title: "Uploads (UploadThing)",
  description:
    "A thin FileStorage port, a single catch-all route, and a disabled state that doesn't 500.",
};

export function UploadsIntegrationsPage() {
  return (
    <DocsLayout
      kicker="05 · Integrations"
      title={meta.title}
      description={meta.description}
      path="/docs/integrations/uploads"
    >
      <DocsP>
        Uploads are optional. When <DocsCode>UPLOADTHING_TOKEN</DocsCode> is
        set, avatars and image uploads go through UploadThing's signed-URL
        flow; when it isn't, the feature is disabled at boot and the
        upload routes return a stable 501 the web client can render as a
        disabled-state.
      </DocsP>

      <DocsH2>The port</DocsH2>
      <DocsCodeBlock caption="apps/api/src/uploads/application/file-storage.ts">
        {`export interface FileStoragePolicy {
  readonly allowedMimeTypes: readonly string[];
  readonly maxFileSizeBytes: number;
  readonly maxFilesPerUpload: number;
}

export type FileStorageRouteHandler = (request: Request) => Promise<Response>;

export interface FileStorage {
  readonly policy: FileStoragePolicy;
  routeHandler(): FileStorageRouteHandler;
  delete(storageKey: string): Promise<void>;
}`}
      </DocsCodeBlock>
      <DocsP>
        Three things live on the port: the policy (content-type allowlist,
        size caps, per-request count), a catch-all route handler the API
        mounts blindly, and a <DocsCode>delete</DocsCode> for garbage
        collection. Most provider-specific logic lives inside the handler —
        the API just proxies.
      </DocsP>

      <DocsH2>The default policy</DocsH2>
      <DocsCodeBlock caption="apps/api/src/composition.ts">
        {`uploads: {
  uploadthingToken: process.env.UPLOADTHING_TOKEN ?? null,
  policy: {
    allowedMimeTypes: ["image/png", "image/jpeg", "image/gif", "image/webp"],
    maxFileSizeBytes: 16 * 1024 * 1024,
    maxFilesPerUpload: 1,
  },
}`}
      </DocsCodeBlock>
      <DocsP>
        16 MiB, PNG/JPEG/GIF/WebP, one file per request. Tuned for avatars
        and inline images. When you need video or wider file-type support,
        change the policy here — both the UploadThing router and the API's
        bound is driven by the same values.
      </DocsP>

      <DocsH2>The two implementations</DocsH2>

      <DocsH3>UploadthingFileStorage</DocsH3>
      <DocsP>
        Wraps the UploadThing SDK. At construction it builds a router whose
        middleware calls a{" "}
        <DocsCode>UploadSessionResolver</DocsCode> — the API's better-auth
        session — to stamp each upload with a user id:
      </DocsP>
      <DocsCodeBlock caption="apps/api/src/uploads/infrastructure/uploadthing-file-storage.ts">
        {`function buildRouter(resolveSession, policy): FileRouter {
  const f = createUploadthing();
  const maxFileSize = formatSize(policy.maxFileSizeBytes) as "16MB";
  return {
    image: f({ image: { maxFileSize, maxFileCount: policy.maxFilesPerUpload } })
      .middleware(async ({ req }) => {
        const userId = await resolveSession(req);
        if (!userId) throw new UploadThingError({
          code: "FORBIDDEN",
          message: "sign in to upload",
        });
        return { userId };
      })
      .onUploadComplete(async ({ metadata, file }) => ({
        uploadedBy: metadata.userId,
        key: file.key,
        name: file.name,
        size: file.size,
        type: file.type,
      })),
  };
}`}
      </DocsCodeBlock>
      <DocsP>
        <DocsCode>onUploadComplete</DocsCode>'s return value lands on the
        client as the upload's metadata — that's what the web app persists
        as the user's avatar key.
      </DocsP>

      <DocsH3>NoopFileStorage (disabled)</DocsH3>
      <DocsCodeBlock>
        {`routeHandler(): FileStorageRouteHandler {
  return async () =>
    new Response(
      JSON.stringify({
        error: {
          code: "uploads.not_configured",
          message: "file uploads are disabled: set UPLOADTHING_TOKEN to enable",
        },
      }),
      { status: 501, headers: { "content-type": "application/json" } },
    );
}`}
      </DocsCodeBlock>
      <DocsCallout>
        The disabled-state response has a stable error code, not a random
        500. The web client checks for <DocsCode>uploads.not_configured</DocsCode>{" "}
        and hides the upload affordance rather than showing a scary error.
      </DocsCallout>

      <DocsH2>The HTTP surface</DocsH2>
      <DocsCodeBlock caption="apps/api/src/interfaces/http/controllers/uploads.controller.ts">
        {`uploads.all("/*", async (c) => {
  const container = c.get("container");
  const handler = container.fileStorage.routeHandler();
  return handler(c.req.raw);
});`}
      </DocsCodeBlock>
      <DocsP>
        The controller is deliberately dumb: <em>any</em> method,{" "}
        <em>any</em> sub-path under <DocsCode>/v1/uploads</DocsCode>, forward
        the raw <DocsCode>Request</DocsCode> to the provider's handler. The
        provider owns the protocol. Swapping to S3 + pre-signed URLs would
        mean implementing a new adapter; the controller stays identical.
      </DocsP>

      <DocsH2>The client side</DocsH2>
      <DocsP>
        The web app uses UploadThing's React hooks, pointed at the same{" "}
        <DocsCode>/v1/uploads</DocsCode> endpoint via{" "}
        <DocsCode>VITE_API_URL</DocsCode>:
      </DocsP>
      <DocsCodeBlock>
        {`import { useUploadThing } from "~/lib/uploads/client";

function AvatarUploader() {
  const { startUpload, isUploading } = useUploadThing("image", {
    onClientUploadComplete: ([file]) => {
      if (!file) return;
      saveAvatar({ key: file.key });  // call the app API to persist
    },
  });
  // ...
}`}
      </DocsCodeBlock>
      <DocsCallout kind="warn">
        The upload itself goes directly to UploadThing's CDN, not through the
        API — which is why it stays snappy for big files. Only the metadata
        callback (<DocsCode>onUploadComplete</DocsCode>) lands in the API,
        over HMAC-signed callback. Don't put anything secret in the upload
        response.
      </DocsCallout>

      <DocsH2>Deleting files</DocsH2>
      <DocsP>
        <DocsCode>fileStorage.delete(storageKey)</DocsCode> hits UploadThing's
        delete endpoint and returns void. The adapter treats 4xx on
        already-gone files as success — garbage collection is idempotent.
        Call it from projectors that listen for{" "}
        <DocsCode>AvatarReplaced</DocsCode> or{" "}
        <DocsCode>UserDeleted</DocsCode>.
      </DocsP>

      <DocsH2>Swapping to S3 / R2 / GCS</DocsH2>
      <DocsList ordered>
        <li>
          Implement <DocsCode>FileStorage</DocsCode> in{" "}
          <DocsCode>uploads/infrastructure/s3-file-storage.ts</DocsCode> —{" "}
          <DocsCode>routeHandler()</DocsCode> returns a handler that generates
          pre-signed PUT URLs from an initial POST, and serves completions on
          a second route.
        </li>
        <li>
          Extend <DocsCode>buildFileStorage()</DocsCode> to pick the new
          adapter based on your own env var (e.g.{" "}
          <DocsCode>UPLOADS_PROVIDER</DocsCode>).
        </li>
        <li>
          Adjust the web-side hooks — UploadThing's React client is
          UploadThing-specific, so you'd swap to a provider-matching hook or
          a plain <DocsCode>fetch</DocsCode>-based uploader.
        </li>
      </DocsList>
      <DocsP>
        The domain never changes — the app still speaks in storage keys and
        policies. Adapters own the transport.
      </DocsP>
    </DocsLayout>
  );
}
