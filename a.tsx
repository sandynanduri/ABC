import { useState, useMemo, useRef, useEffect } from "react";
import { Plus, Search, Download, Upload, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import GoldenKeyModal from "./GoldenKeyModal";
import { GoldenKey, GoldenKeyFilters, DATA_TYPES, APPROVAL_STATUSES } from "@/types/golden-key";
import { useToast } from "@/hooks/use-toast";
import { GoldenKeysJsonService } from "@/lib/golden-keys-json-service";

// UUID generator function (fallback for environments without crypto.randomUUID)
function generateUUID(): string {
  // Try to use crypto.randomUUID if available
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: Generate UUID v4 manually
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const GoldenKeysTable = () => {
  const [goldenKeys, setGoldenKeys] = useState<GoldenKey[]>([]);
  const { toast } = useToast();
  const [filters, setFilters] = useState<GoldenKeyFilters>({
    search: "",
    dataType: "",
    owner: "",
    approvalStatus: ""
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<GoldenKey | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load golden keys from JSON files on mount
  useEffect(() => {
    const loadKeys = async () => {
      try {
        setIsLoading(true);
        const [pending, approved] = await Promise.all([
          GoldenKeysJsonService.getPendingKeys(),
          GoldenKeysJsonService.getApprovedKeys(),
        ]);
        // Combine pending and approved keys for display (exclude rejected)
        setGoldenKeys([...pending, ...approved]);
      } catch (error) {
        console.error("Error loading golden keys:", error);
        toast({
          title: "Error",
          description: "Failed to load golden keys",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadKeys();
  }, [toast]);

  // Filter and search logic
  const filteredKeys = useMemo(() => {
    return goldenKeys.filter(key => {
      const searchMatch = !filters.search || 
        key.key.toLowerCase().includes(filters.search.toLowerCase()) ||
        key.label.toLowerCase().includes(filters.search.toLowerCase()) ||
        key.description.toLowerCase().includes(filters.search.toLowerCase()) ||
        key.owner.toLowerCase().includes(filters.search.toLowerCase());
      
      const dataTypeMatch = !filters.dataType || key.dataType === filters.dataType;
      const ownerMatch = !filters.owner || key.owner === filters.owner;
      const statusMatch = !filters.approvalStatus || key.approvalStatus === filters.approvalStatus;
      
      return searchMatch && dataTypeMatch && ownerMatch && statusMatch;
    });
  }, [goldenKeys, filters]);

  // Get unique owners for filter dropdown
  const uniqueOwners = useMemo(() => {
    return Array.from(new Set(goldenKeys.map(key => key.owner)));
  }, [goldenKeys]);

  const handleCreate = () => {
    setEditingKey(null);
    setModalOpen(true);
  };

  const handleEdit = (key: GoldenKey) => {
    setEditingKey(key);
    setModalOpen(true);
  };

  const handleSave = async (keyData: Partial<GoldenKey>) => {
    try {
      if (editingKey) {
        // Update existing key (only if it's pending)
        if (editingKey.approvalStatus === 'pending') {
          await GoldenKeysJsonService.updatePendingKey(editingKey.id, keyData);
          // Reload keys (only pending and approved)
          const [pending, approved] = await Promise.all([
            GoldenKeysJsonService.getPendingKeys(),
            GoldenKeysJsonService.getApprovedKeys(),
          ]);
          setGoldenKeys([...pending, ...approved]);
          toast({
            title: "Golden Key Updated",
            description: `Successfully updated ${keyData.key || editingKey.key}`,
          });
        } else {
          toast({
            title: "Cannot Update",
            description: "Only pending keys can be updated",
            variant: "destructive",
          });
          return;
        }
      } else {
        // Create new key with pending approval status
        const newKey: GoldenKey = {
          id: generateUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
          approvalStatus: 'pending',
          version: '1.0',
          ...keyData
        } as GoldenKey;
        
        // Save to pending_golden_keys.json
        console.log('Attempting to save golden key:', newKey);
        await GoldenKeysJsonService.addPendingKey(newKey);
        console.log('Key saved successfully, reloading...');
        
        // Reload keys (only pending and approved)
        const [pending, approved] = await Promise.all([
          GoldenKeysJsonService.getPendingKeys(),
          GoldenKeysJsonService.getApprovedKeys(),
        ]);
        console.log('Reloaded keys - Pending:', pending.length, 'Approved:', approved.length);
        setGoldenKeys([...pending, ...approved]);
        
        toast({
          title: "Golden Key Created",
          description: `Successfully created ${newKey.key} and added to pending approval`,
        });
      }
    } catch (error: any) {
      console.error('Error saving golden key:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save Golden Key. Please make sure the backend server is running on port 3001.",
        variant: "destructive",
      });
    }
    
    // Close modal
    setModalOpen(false);
    setEditingKey(null);
  };

  const handleDelete = async (key: GoldenKey) => {
    try {
      // Only allow deletion of pending keys
      if (key.approvalStatus === 'pending') {
        await GoldenKeysJsonService.deletePendingKey(key.id);
        // Reload keys (only pending and approved)
        const [pending, approved] = await Promise.all([
          GoldenKeysJsonService.getPendingKeys(),
          GoldenKeysJsonService.getApprovedKeys(),
        ]);
        setGoldenKeys([...pending, ...approved]);
        toast({
          title: "Golden Key Deleted",
          description: `Successfully deleted ${key.key}`,
        });
      } else {
        toast({
          title: "Cannot Delete",
          description: "Only pending keys can be deleted",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete Golden Key",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonContent = e.target?.result as string;
        const imported = JSON.parse(jsonContent);
        if (Array.isArray(imported)) {
          const keys = imported.map((key: any) => ({
            ...key,
            id: key.id || crypto.randomUUID(),
            createdAt: new Date(key.createdAt),
            updatedAt: new Date(key.updatedAt),
            approvedAt: key.approvedAt ? new Date(key.approvedAt) : undefined,
          }));
          setGoldenKeys(prevKeys => [...prevKeys, ...keys]);
          toast({
            title: "Upload Complete",
            description: "Golden Keys imported successfully",
          });
        } else {
          throw new Error('Invalid JSON format');
        }
      } catch (error) {
        toast({
          title: "Upload Failed",
          description: "Invalid JSON file format",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const getStatusBadge = (status: GoldenKey['approvalStatus']) => {
    const statusConfig = APPROVAL_STATUSES.find(s => s.value === status);
    return (
      <Badge 
        className={`${statusConfig?.color} font-medium px-3 py-1.5 hover-scale transition-all duration-200 shadow-sm`}
      >
        {statusConfig?.label}
      </Badge>
    );
  };

  const getDataTypeBadge = (dataType: string) => {
    return (
      <Badge 
        variant="outline" 
        className="bg-primary/10 border-primary/30 text-primary font-semibold px-3 py-1.5 hover-scale transition-all duration-200 hover:bg-primary/15 hover:border-primary/40 uppercase text-xs"
      >
        {dataType}
      </Badge>
    );
  };

  return (
    <TooltipProvider>
      <Card className="w-full shadow-sm border-0 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Golden Keys Catalog
              </CardTitle>
              <div className="flex items-center gap-4">
                <p className="text-muted-foreground font-medium">
                  {filteredKeys.length} of {goldenKeys.length} keys
                </p>
                <div className="text-xs text-muted-foreground">
                  {goldenKeys.filter(k => k.approvalStatus === 'pending').length} pending
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".json"
                className="hidden"
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleUploadClick}
                className="hover-scale border-border/50 hover:border-border hover:bg-muted/50 transition-all duration-200"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import Golden Keys
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  const jsonData = JSON.stringify(goldenKeys, (key, value) => {
                    if (value instanceof Date) {
                      return value.toISOString();
                    }
                    return value;
                  }, 2);
                  const blob = new Blob([jsonData], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'golden-keys.json';
                  a.click();
                  URL.revokeObjectURL(url);
                  toast({
                    title: "Export Complete",
                    description: "Golden Keys exported to JSON file",
                  });
                }}
                className="hover-scale border-border/50 hover:border-border hover:bg-muted/50 transition-all duration-200"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Golden Keys
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setGoldenKeys([]);
                  toast({
                    title: "Storage Cleared",
                    description: "All Golden Keys have been removed",
                  });
                }}
                className="hover-scale border-border/50 hover:border-border hover:bg-muted/50 transition-all duration-200"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
              <Button 
                onClick={handleCreate} 
                size="sm"
                className="hover-scale bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                Define New Key
              </Button>
            </div>
          </div>
          
          {/* Modern Filters */}
          <div className="flex items-center gap-4 mt-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground transition-colors duration-200" />
              <Input
                placeholder="Search keys, labels, descriptions..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10 border-border/50 focus:border-primary/50 bg-background/50 backdrop-blur-sm hover:bg-background transition-all duration-200"
              />
            </div>
            
            <Select value={filters.dataType} onValueChange={(value) => setFilters(prev => ({ ...prev, dataType: value || "" }))}>
              <SelectTrigger className="w-36 border-border/50 hover:border-border bg-background/50 backdrop-blur-sm hover:bg-background transition-all duration-200">
                <SelectValue placeholder="Data Type" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover/95 backdrop-blur-sm border shadow-lg">
                {DATA_TYPES.map(type => (
                  <SelectItem 
                    key={type.value} 
                    value={type.value}
                    className="hover:bg-muted/50 transition-colors duration-200"
                  >
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filters.approvalStatus} onValueChange={(value) => setFilters(prev => ({ ...prev, approvalStatus: value || "" }))}>
              <SelectTrigger className="w-36 border-border/50 hover:border-border bg-background/50 backdrop-blur-sm hover:bg-background transition-all duration-200">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover/95 backdrop-blur-sm border shadow-lg">
                {APPROVAL_STATUSES.map(status => (
                  <SelectItem 
                    key={status.value} 
                    value={status.value}
                    className="hover:bg-muted/50 transition-colors duration-200"
                  >
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filters.owner} onValueChange={(value) => setFilters(prev => ({ ...prev, owner: value || "" }))}>
              <SelectTrigger className="w-48 border-border/50 hover:border-border bg-background/50 backdrop-blur-sm hover:bg-background transition-all duration-200">
                <SelectValue placeholder="Owner" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover/95 backdrop-blur-sm border shadow-lg">
                {uniqueOwners.map(owner => (
                  <SelectItem 
                    key={owner} 
                    value={owner}
                    className="hover:bg-muted/50 transition-colors duration-200"
                  >
                    {owner}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-300px)]" style={{ scrollbarWidth: 'thin', scrollbarGutter: 'stable', display: 'flex', flexDirection: 'column' }}>
            <div style={{ minWidth: '1300px' }}>
              <Table className="w-full">
              <TableHeader className="bg-muted/30 border-b">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-32 resize-x font-semibold text-foreground h-12 px-6">Key</TableHead>
                  <TableHead className="w-48 resize-x font-semibold text-foreground h-12 px-6">Label</TableHead>
                  <TableHead className="w-64 resize-x font-semibold text-foreground h-12 px-6">Description</TableHead>
                  <TableHead className="w-24 resize-x font-semibold text-foreground h-12 px-6">Type</TableHead>
                  <TableHead className="w-20 resize-x font-semibold text-foreground h-12 px-6">Required</TableHead>
                  <TableHead className="w-20 resize-x font-semibold text-foreground h-12 px-6">Version</TableHead>
                  <TableHead className="w-24 resize-x font-semibold text-foreground h-12 px-6">Status</TableHead>
                  <TableHead className="w-48 resize-x font-semibold text-foreground h-12 px-6">Owner</TableHead>
                  <TableHead className="w-32 font-semibold text-foreground h-12 px-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/50">
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-16">
                      <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p className="text-muted-foreground">Loading golden keys...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {filteredKeys.map((key, index) => (
                  <TableRow 
                    key={key.id} 
                    className="group hover:bg-muted/20 transition-all duration-200 animate-fade-in border-0"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <TableCell className="font-mono text-sm font-medium px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary/20 group-hover:bg-primary/40 transition-colors duration-200" />
                        <span className="group-hover:text-primary transition-colors duration-200">
                          {key.key}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold px-6 py-4 group-hover:text-primary transition-colors duration-200">
                      {key.label}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground px-6 py-4">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="line-clamp-2 cursor-help group-hover:text-foreground transition-colors duration-200">
                            {key.description}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-sm z-50 bg-popover border shadow-lg">
                          <p>{key.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {getDataTypeBadge(key.dataType)}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge 
                        variant={key.required ? "default" : "secondary"} 
                        className="text-xs font-medium px-2.5 py-1 hover-scale transition-transform duration-200"
                      >
                        {key.required ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm px-6 py-4 text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                      v{key.version}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {getStatusBadge(key.approvalStatus)}
                    </TableCell>
                    <TableCell className="text-sm px-6 py-4 text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                      {key.owner}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleEdit(key)}
                              className="h-8 w-8 hover-scale hover:bg-primary/10 hover:text-primary transition-all duration-200"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="z-50 bg-popover border shadow-lg">
                            Edit Golden Key
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDelete(key)}
                              className="h-8 w-8 hover-scale hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="z-50 bg-popover border shadow-lg">
                            Delete Golden Key
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                    </TableRow>
                    ))}
                    {filteredKeys.length === 0 && !isLoading && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-16 animate-fade-in">
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center">
                              <Search className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div className="text-center">
                              <h3 className="font-medium text-foreground mb-2">
                                {goldenKeys.length === 0 ? "No Golden Keys Yet" : "No Results Found"}
                              </h3>
                              <p className="text-sm text-muted-foreground max-w-md">
                                {goldenKeys.length === 0 
                                  ? "Get started by creating your first golden key to standardize your data definitions."
                                  : "No golden keys match your current filters. Try adjusting your search criteria."
                                }
                              </p>
                            </div>
                            {goldenKeys.length === 0 && (
                              <Button onClick={handleCreate} className="mt-2 hover-scale">
                                <Plus className="h-4 w-4 mr-2" />
                                Create Your First Golden Key
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <GoldenKeyModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editingKey={editingKey}
        onSave={handleSave}
      />
    </TooltipProvider>
  );
};

export default GoldenKeysTable;
