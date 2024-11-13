type SettingsSectionTitleProps = {
    title: string | React.ReactNode;
    description: string | React.ReactNode;
};

export default function SettingsSectionTitle({
    title,
    description,
}: SettingsSectionTitleProps) {
    return (
        <div className="space-y-0.5 select-none mb-6">
            <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
            <p className="text-muted-foreground">{description}</p>
        </div>
    );
}
