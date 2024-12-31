import React from "react";

export function LetterHead() {
    return (
        <table
            role="presentation"
            width="100%"
            style={{
                marginBottom: "24px"
            }}
        >
            <tr>
                <td
                    style={{
                        fontSize: "14px",
                        fontWeight: "bold",
                        color: "#F97317"
                    }}
                >
                    Pangolin
                </td>
                <td
                    style={{
                        fontSize: "14px",
                        textAlign: "right",
                        color: "#6B7280"
                    }}
                >
                    {new Date().getFullYear()}
                </td>
            </tr>
        </table>
    );
}

export default LetterHead;
