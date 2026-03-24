export type DomainRoute = {
    mode: 'pack' | 'hybrid' | 'custom';
    pack: string | null;
    confidence: number;
    reasons: string[];
};

const PACK_KEYWORDS: Record<string, string[]> = {
    ecommerce: ['ecommerce', 'e-commerce', 'shop', 'store', 'cart', 'checkout', 'order'],
    booking: ['booking', 'appointment', 'schedule', 'reservation', 'slot'],
    lms: ['lms', 'course', 'lesson', 'student', 'enrollment', 'quiz'],
    saas: ['saas', 'workspace', 'subscription', 'tenant', 'organization'],
    healthcare: ['clinic', 'hospital', 'patient', 'doctor', 'medical', 'prescription'],
    crm: ['crm', 'lead', 'pipeline', 'customer', 'opportunity'],
    inventory: ['inventory', 'stock', 'warehouse', 'sku', 'supplier'],
    realestate: ['real estate', 'property', 'listing', 'agent', 'rent', 'viewing'],
};

function scorePack(text: string, keywords: string[]): number {
    let score = 0;
    for (const keyword of keywords) {
        if (text.includes(keyword)) score += 1;
    }
    return score;
}

export function routeDomainPack(userPrompt: string): DomainRoute {
    const text = String(userPrompt || '').toLowerCase();
    const entries = Object.entries(PACK_KEYWORDS)
        .map(([pack, keywords]) => ({ pack, score: scorePack(text, keywords) }))
        .sort((a, b) => b.score - a.score);

    const top = entries[0] || { pack: '', score: 0 };
    const second = entries[1] || { pack: '', score: 0 };
    const totalSignals = entries.reduce((sum, entry) => sum + entry.score, 0);
    const share = totalSignals > 0 ? top.score / totalSignals : 0;
    const confidence = Math.max(0, Math.min(1, (share * 0.7) + ((Math.min(top.score, 5) / 5) * 0.3)));

    if (top.score >= 3 && confidence >= 0.7 && second.score <= 1) {
        return {
            mode: 'pack',
            pack: top.pack,
            confidence,
            reasons: [`High-confidence match for "${top.pack}"`],
        };
    }

    if (top.score >= 2 && second.score >= 2) {
        return {
            mode: 'hybrid',
            pack: top.pack,
            confidence,
            reasons: ['Mixed domain intent detected; using hybrid generation'],
        };
    }

    return {
        mode: 'custom',
        pack: null,
        confidence,
        reasons: ['Low-confidence domain match; using custom planner mode'],
    };
}

