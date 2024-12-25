"use client";

import { useState } from "react";
import Enable2FaForm from "@app/components/Enable2FaForm";

export default function ProfileGeneralPage() {
    const [open, setOpen] = useState(true);

    return (
        <>
            <Enable2FaForm open={open} setOpen={setOpen} />
        </>
    );
}
