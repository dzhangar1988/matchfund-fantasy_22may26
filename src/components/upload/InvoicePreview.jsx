import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Plus, Trash2, XCircle, CheckCircle } from "lucide-react";

const CATEGORIES = [
  "office_supplies",
  "travel",
  "utilities",
  "software_subscriptions",
  "hardware",
  "professional_services",
  "marketing",
  "rent",
  "insurance",
  "maintenance",
  "telecommunications",
  "training",
  "shipping",
  "meals_entertainment",
  "other"
];

export default function InvoicePreview({ 
  extractedData, 
  onSave,
  onCancel,
  isProcessing 
}) {
  const [editedData, setEditedData] = useState(extractedData);

  const handleInputChange = (field, value) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...(editedData.items || [])];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
    };

    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = (newItems[index].quantity || 0) * (newItems[index].unit_price || 0);
    }

    setEditedData(prev => ({
      ...prev,
      items: newItems
    }));
  };

  const addNewItem = () => {
    setEditedData(prev => ({
      ...prev,
      items: [...(prev.items || []), {
        description: '',
        quantity: 1,
        unit_price: 0,
        total: 0
      }]
    }));
  };

  const removeItem = (index) => {
    setEditedData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateTotal = () => {
    return editedData.items?.reduce((sum, item) => sum + (item.total || 0), 0) || 0;
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Review Invoice Details</span>
          <div className="text-sm font-normal text-gray-500">
            * Please verify and edit if needed
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="vendor">Vendor</Label>
            <Input
              id="vendor"
              value={editedData.vendor || ''}
              onChange={(e) => handleInputChange('vendor', e.target.value)}
              placeholder="Vendor name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice_number">Invoice Number</Label>
            <Input
              id="invoice_number"
              value={editedData.invoice_number || ''}
              onChange={(e) => handleInputChange('invoice_number', e.target.value)}
              placeholder="Invoice #"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Invoice Date</Label>
            <Input
              id="date"
              type="date"
              value={editedData.date || ''}
              onChange={(e) => handleInputChange('date', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={editedData.category || ''}
              onValueChange={(value) => handleInputChange('category', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Invoice Items</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={addNewItem}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Item
            </Button>
          </div>
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editedData.items?.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        value={item.description || ''}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        placeholder="Item description"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={item.quantity || ''}
                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price || ''}
                        onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value))}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        ${(item.total || 0).toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!editedData.items || editedData.items.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 py-4">
                      No items added. Click "Add Item" to start.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end space-x-4 items-center text-lg">
            <span className="font-medium">Total Amount:</span>
            <span className="font-bold">${calculateTotal().toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-3 pt-6">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex items-center gap-2"
        >
          <XCircle className="w-4 h-4" /> Cancel
        </Button>
        <Button
          onClick={() => onSave({ ...editedData, total_amount: calculateTotal() })}
          disabled={isProcessing}
          className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4" /> Save Invoice
        </Button>
      </CardFooter>
    </Card>
  );
}