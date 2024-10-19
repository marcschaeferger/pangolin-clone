"use client"

export function NewtConfig() {
  const config = `curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh`;

  return (
    <pre className="mt-2 w-full rounded-md bg-slate-950 p-4 overflow-x-auto">
      <code className="text-white whitespace-pre-wrap">{config}</code>
    </pre>
  );
};