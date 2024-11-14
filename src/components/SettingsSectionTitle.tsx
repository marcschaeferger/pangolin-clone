type SettingsSectionTitleProps = {
    title: string | React.ReactNode;
    description: string | React.ReactNode;
    size?: "2xl" | "1xl";
};

export default function SettingsSectionTitle({
    title,
    description,
    size,
}: SettingsSectionTitleProps) {
    return (
        <div className="space-y-0.5 select-none mb-6">
            <h2
                className={`text-${
                    size ? size : "2xl"
                } font-bold tracking-tight`}
            >
                {title}
            </h2>
            <p className="text-muted-foreground">{description}</p>
        </div>
    );
}
