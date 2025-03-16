export function SettingsContainer({ children }: { children: React.ReactNode }) {
    return <div className="space-y-6">{children}</div>
}

export function SettingsSection({ children }: { children: React.ReactNode }) {
    return <div className="border rounded-lg bg-card p-5">{children}</div>
}

export function SettingsSectionHeader({ children }: { children: React.ReactNode }) {
    return <div className="text-lg space-y-0.5 pb-6">{children}</div>
}

export function SettingsSectionForm({ children }: { children: React.ReactNode }) {
    return <div className="max-w-xl">{children}</div>
}

export function SettingsSectionTitle({ children }: { children: React.ReactNode }) {
    return <h2 className="text-1xl font-bold tracking-tight flex items-center gap-2">{children}</h2>
}

export function SettingsSectionDescription({ children }: { children: React.ReactNode }) {
    return <p className="text-muted-foreground text-sm">{children}</p>
}

export function SettingsSectionBody({ children }: { children: React.ReactNode }) {
    return <div className="space-y-5">{children}</div>
}

export function SettingsSectionFooter({ children }: { children: React.ReactNode }) {
    return <div className="flex justify-end space-x-4 mt-8">{children}</div>
}
