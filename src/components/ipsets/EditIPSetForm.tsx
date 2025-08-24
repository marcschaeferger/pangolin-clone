import React, { useState, useCallback, useMemo } from "react";
import { Input } from "@app/components/ui/input";
import { Textarea } from "@app/components/ui/textarea";
import { Button } from "@app/components/ui/button";
import { IPSet } from './IPSetManager';

interface EditIPSetFormProps {
  ipSet: IPSet;
  onSave: (data: Partial<IPSet>) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
  t: (key: string) => string;
}

export default function EditIPSetForm({
  ipSet,
  onSave,
  onCancel,
  loading,
  t,
}: EditIPSetFormProps) {
  const [name, setName] = useState(ipSet.name);
  const [description, setDescription] = useState(ipSet.description ?? "");
  const [ips, setIPs] = useState<string[]>(ipSet.ips);

  const handleIPChange = useCallback((index: number, value: string) => {
    setIPs((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  }, []);

  const handleAddIP = useCallback(() => {
    setIPs((prev) => [...prev, ""]);
  }, []);

  const handleRemoveIP = useCallback((index: number) => {
    setIPs((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = useCallback(async () => {
    const ipArray = ips.filter((ip) => ip.trim()).map((ip) => ip.trim());
    await onSave({ name: name.trim(), description: description.trim(), ips: ipArray });
  }, [name, description, ips, onSave]);

  const isValid = useMemo(
    () => name.trim().length > 0 && ips.some((ip) => ip.trim()),
    [name, ips]
  );

  return (
    <div className="space-y-4">
      {/* Name */}
      <div>
                <label className="block text-sm font-medium mb-1">{t('name')}</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
                    placeholder={t('ipSetNamePlaceholder')}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-1">
                    {t('description')} ({t('optional')})
        </label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('ipSetDescriptionPlaceholder')}
          rows={2}
        />
      </div>

      {/* IP List */}
      <div>
                <label className="block text-sm font-medium mb-1">{t('addipaddress')}</label>
        <div className="space-y-2">
          {ips.map((ip, index) => (
            <div key={index} className="flex items-center space-x-2">
              <Input
                value={ip}
                onChange={(e) => handleIPChange(index, e.target.value)}
                placeholder="192.168.1.1 or 192.168.1.0/24"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => handleRemoveIP(index)}
                disabled={ips.length === 1}
              >
                                {t('remove')}
              </Button>
            </div>
          ))}
                    <Button 
                        type="button" 
                        variant="secondary" 
                        onClick={handleAddIP}
                    >
                        {t('addipaddress')}
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
                    {t('cancel')}
        </Button>
        <Button
          onClick={handleSave}
          loading={loading}
          disabled={!isValid || loading}
        >
                    {t('save')}
        </Button>
      </div>
    </div>
  );
}