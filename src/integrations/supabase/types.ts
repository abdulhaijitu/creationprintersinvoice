export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
        }
        Relationships: []
      }
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          date: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["attendance_status"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["attendance_status"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["attendance_status"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string
          entity_type: string
          id: string
          organization_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          organization_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          organization_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_invoices: {
        Row: {
          amount: number
          billing_period_end: string
          billing_period_start: string
          business_name: string
          created_at: string
          due_date: string
          generated_date: string
          id: string
          invoice_number: string
          notes: string | null
          organization_id: string
          owner_email: string | null
          paid_date: string | null
          payment_method: string | null
          payment_reference: string | null
          plan_name: string
          status: string
          tax: number | null
          total_payable: number
          updated_at: string
        }
        Insert: {
          amount?: number
          billing_period_end: string
          billing_period_start: string
          business_name: string
          created_at?: string
          due_date: string
          generated_date?: string
          id?: string
          invoice_number: string
          notes?: string | null
          organization_id: string
          owner_email?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          plan_name?: string
          status?: string
          tax?: number | null
          total_payable?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          billing_period_end?: string
          billing_period_start?: string
          business_name?: string
          created_at?: string
          due_date?: string
          generated_date?: string
          id?: string
          invoice_number?: string
          notes?: string | null
          organization_id?: string
          owner_email?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          plan_name?: string
          status?: string
          tax?: number | null
          total_payable?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          address: string | null
          address_bn: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_branch: string | null
          bank_name: string | null
          bank_routing_number: string | null
          company_name: string
          company_name_bn: string | null
          created_at: string
          email: string | null
          id: string
          invoice_footer: string | null
          invoice_prefix: string | null
          invoice_terms: string | null
          logo_url: string | null
          mobile_banking: string | null
          phone: string | null
          quotation_prefix: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          address_bn?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          company_name?: string
          company_name_bn?: string | null
          created_at?: string
          email?: string | null
          id?: string
          invoice_footer?: string | null
          invoice_prefix?: string | null
          invoice_terms?: string | null
          logo_url?: string | null
          mobile_banking?: string | null
          phone?: string | null
          quotation_prefix?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          address_bn?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          company_name?: string
          company_name_bn?: string | null
          created_at?: string
          email?: string | null
          id?: string
          invoice_footer?: string | null
          invoice_prefix?: string | null
          invoice_terms?: string | null
          logo_url?: string | null
          mobile_banking?: string | null
          phone?: string | null
          quotation_prefix?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          company_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_challan_items: {
        Row: {
          challan_id: string
          created_at: string
          description: string
          id: string
          invoice_item_id: string | null
          organization_id: string | null
          quantity: number
          unit: string | null
        }
        Insert: {
          challan_id: string
          created_at?: string
          description: string
          id?: string
          invoice_item_id?: string | null
          organization_id?: string | null
          quantity?: number
          unit?: string | null
        }
        Update: {
          challan_id?: string
          created_at?: string
          description?: string
          id?: string
          invoice_item_id?: string | null
          organization_id?: string | null
          quantity?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_challan_items_challan_id_fkey"
            columns: ["challan_id"]
            isOneToOne: false
            referencedRelation: "delivery_challans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_challan_items_invoice_item_id_fkey"
            columns: ["invoice_item_id"]
            isOneToOne: false
            referencedRelation: "invoice_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_challan_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_challans: {
        Row: {
          challan_date: string
          challan_number: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          delivery_address: string | null
          driver_name: string | null
          driver_phone: string | null
          id: string
          invoice_id: string
          notes: string | null
          organization_id: string | null
          status: string
          updated_at: string
          vehicle_info: string | null
        }
        Insert: {
          challan_date?: string
          challan_number: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          delivery_address?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          invoice_id: string
          notes?: string | null
          organization_id?: string | null
          status?: string
          updated_at?: string
          vehicle_info?: string | null
        }
        Update: {
          challan_date?: string
          challan_number?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          delivery_address?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          invoice_id?: string
          notes?: string | null
          organization_id?: string | null
          status?: string
          updated_at?: string
          vehicle_info?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_challans_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_challans_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_challans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_advances: {
        Row: {
          amount: number
          created_at: string | null
          date: string
          deducted_from_month: number | null
          deducted_from_year: number | null
          employee_id: string
          id: string
          organization_id: string | null
          reason: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          date?: string
          deducted_from_month?: number | null
          deducted_from_year?: number | null
          employee_id: string
          id?: string
          organization_id?: string | null
          reason?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          date?: string
          deducted_from_month?: number | null
          deducted_from_year?: number | null
          employee_id?: string
          id?: string
          organization_id?: string | null
          reason?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_advances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_advances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string | null
          date: string
          employee_id: string
          id: string
          notes: string | null
          organization_id: string | null
          status: Database["public"]["Enums"]["attendance_status"] | null
          updated_at: string | null
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date?: string
          employee_id: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          status?: Database["public"]["Enums"]["attendance_status"] | null
          updated_at?: string | null
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date?: string
          employee_id?: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          status?: Database["public"]["Enums"]["attendance_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_attendance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_salary_records: {
        Row: {
          advance: number | null
          basic_salary: number
          bonus: number | null
          created_at: string | null
          deductions: number | null
          employee_id: string
          id: string
          month: number
          net_payable: number
          notes: string | null
          organization_id: string | null
          overtime_amount: number | null
          overtime_hours: number | null
          paid_date: string | null
          status: string | null
          updated_at: string | null
          year: number
        }
        Insert: {
          advance?: number | null
          basic_salary: number
          bonus?: number | null
          created_at?: string | null
          deductions?: number | null
          employee_id: string
          id?: string
          month: number
          net_payable: number
          notes?: string | null
          organization_id?: string | null
          overtime_amount?: number | null
          overtime_hours?: number | null
          paid_date?: string | null
          status?: string | null
          updated_at?: string | null
          year: number
        }
        Update: {
          advance?: number | null
          basic_salary?: number
          bonus?: number | null
          created_at?: string | null
          deductions?: number | null
          employee_id?: string
          id?: string
          month?: number
          net_payable?: number
          notes?: string | null
          organization_id?: string | null
          overtime_amount?: number | null
          overtime_hours?: number | null
          paid_date?: string | null
          status?: string | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "employee_salary_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_salary_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          basic_salary: number | null
          created_at: string | null
          department: string | null
          designation: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean | null
          joining_date: string | null
          nid: string | null
          organization_id: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          basic_salary?: number | null
          created_at?: string | null
          department?: string | null
          designation?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          joining_date?: string | null
          nid?: string | null
          organization_id?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          basic_salary?: number | null
          created_at?: string | null
          department?: string | null
          designation?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          joining_date?: string | null
          nid?: string | null
          organization_id?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          created_by: string | null
          date: string
          description: string
          id: string
          organization_id: string | null
          payment_method: string | null
          receipt_url: string | null
          updated_at: string
          updated_by: string | null
          vendor_bill_id: string | null
          vendor_id: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description: string
          id?: string
          organization_id?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          updated_at?: string
          updated_by?: string | null
          vendor_bill_id?: string | null
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          id?: string
          organization_id?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          updated_at?: string
          updated_by?: string | null
          vendor_bill_id?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_vendor_bill_id_fkey"
            columns: ["vendor_bill_id"]
            isOneToOne: false
            referencedRelation: "vendor_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          discount: number | null
          id: string
          invoice_id: string
          organization_id: string | null
          quantity: number
          total: number
          unit: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          discount?: number | null
          id?: string
          invoice_id: string
          organization_id?: string | null
          quantity?: number
          total: number
          unit?: string | null
          unit_price: number
        }
        Update: {
          created_at?: string
          description?: string
          discount?: number | null
          id?: string
          invoice_id?: string
          organization_id?: string | null
          quantity?: number
          total?: number
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string
          notes: string | null
          organization_id: string | null
          payment_date: string
          payment_method: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id: string
          notes?: string | null
          organization_id?: string | null
          payment_date?: string
          payment_method?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string
          notes?: string | null
          organization_id?: string | null
          payment_date?: string
          payment_method?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          discount: number | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          organization_id: string | null
          paid_amount: number | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          subtotal: number
          tax: number | null
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount?: number | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number: string
          notes?: string | null
          organization_id?: string | null
          paid_amount?: number | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal?: number
          tax?: number | null
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount?: number | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          organization_id?: string | null
          paid_amount?: number | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal?: number
          tax?: number | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          annual_total: number | null
          annual_used: number | null
          casual_total: number | null
          casual_used: number | null
          created_at: string
          id: string
          sick_total: number | null
          sick_used: number | null
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          annual_total?: number | null
          annual_used?: number | null
          casual_total?: number | null
          casual_used?: number | null
          created_at?: string
          id?: string
          sick_total?: number | null
          sick_used?: number | null
          updated_at?: string
          user_id: string
          year?: number
        }
        Update: {
          annual_total?: number | null
          annual_used?: number | null
          casual_total?: number | null
          casual_used?: number | null
          created_at?: string
          id?: string
          sick_total?: number | null
          sick_used?: number | null
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          end_date: string
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason: string | null
          rejection_reason: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_status"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_date: string
          id?: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          rejection_reason?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_date?: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          rejection_reason?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      module_permissions: {
        Row: {
          action: string
          allowed: boolean
          created_at: string
          id: string
          module: string
          role: string
          updated_at: string
        }
        Insert: {
          action: string
          allowed?: boolean
          created_at?: string
          id?: string
          module: string
          role: string
          updated_at?: string
        }
        Update: {
          action?: string
          allowed?: boolean
          created_at?: string
          id?: string
          module?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          organization_id: string | null
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          organization_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          organization_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_branch: string | null
          bank_name: string | null
          bank_routing_number: string | null
          challan_prefix: string | null
          created_at: string
          email: string | null
          id: string
          invoice_footer: string | null
          invoice_prefix: string | null
          invoice_terms: string | null
          logo_url: string | null
          mobile_banking: string | null
          name: string
          owner_email: string | null
          owner_id: string | null
          phone: string | null
          quotation_prefix: string | null
          slug: string
          tax_rate: number | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          challan_prefix?: string | null
          created_at?: string
          email?: string | null
          id?: string
          invoice_footer?: string | null
          invoice_prefix?: string | null
          invoice_terms?: string | null
          logo_url?: string | null
          mobile_banking?: string | null
          name: string
          owner_email?: string | null
          owner_id?: string | null
          phone?: string | null
          quotation_prefix?: string | null
          slug: string
          tax_rate?: number | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          challan_prefix?: string | null
          created_at?: string
          email?: string | null
          id?: string
          invoice_footer?: string | null
          invoice_prefix?: string | null
          invoice_terms?: string | null
          logo_url?: string | null
          mobile_banking?: string | null
          name?: string
          owner_email?: string | null
          owner_id?: string | null
          phone?: string | null
          quotation_prefix?: string | null
          slug?: string
          tax_rate?: number | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      performance_notes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string
          rating: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note: string
          rating?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string
          rating?: number | null
          user_id?: string
        }
        Relationships: []
      }
      price_calculations: {
        Row: {
          binding_cost: number | null
          binding_price: number | null
          binding_qty: number | null
          costing_total: number | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          design_cost: number | null
          design_price: number | null
          design_qty: number | null
          die_cutting_cost: number | null
          die_cutting_price: number | null
          die_cutting_qty: number | null
          final_price: number | null
          foil_printing_price: number | null
          foil_printing_qty: number | null
          foil_printing_total: number | null
          id: string
          invoice_id: string | null
          job_description: string
          lamination_cost: number | null
          lamination_price: number | null
          lamination_qty: number | null
          margin_amount: number | null
          margin_percent: number | null
          organization_id: string | null
          others_cost: number | null
          others_price: number | null
          others_qty: number | null
          paper1_price: number | null
          paper1_qty: number | null
          paper1_total: number | null
          paper2_price: number | null
          paper2_qty: number | null
          paper2_total: number | null
          paper3_price: number | null
          paper3_qty: number | null
          paper3_total: number | null
          plate_price: number | null
          plate_qty: number | null
          plate_total: number | null
          plate2_price: number | null
          plate2_qty: number | null
          plate2_total: number | null
          plate3_price: number | null
          plate3_qty: number | null
          plate3_total: number | null
          price_per_pcs: number | null
          print_price: number | null
          print_qty: number | null
          print_total: number | null
          print2_price: number | null
          print2_qty: number | null
          print2_total: number | null
          print3_price: number | null
          print3_qty: number | null
          print3_total: number | null
          quantity: number | null
          quotation_id: string | null
          updated_at: string
        }
        Insert: {
          binding_cost?: number | null
          binding_price?: number | null
          binding_qty?: number | null
          costing_total?: number | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          design_cost?: number | null
          design_price?: number | null
          design_qty?: number | null
          die_cutting_cost?: number | null
          die_cutting_price?: number | null
          die_cutting_qty?: number | null
          final_price?: number | null
          foil_printing_price?: number | null
          foil_printing_qty?: number | null
          foil_printing_total?: number | null
          id?: string
          invoice_id?: string | null
          job_description: string
          lamination_cost?: number | null
          lamination_price?: number | null
          lamination_qty?: number | null
          margin_amount?: number | null
          margin_percent?: number | null
          organization_id?: string | null
          others_cost?: number | null
          others_price?: number | null
          others_qty?: number | null
          paper1_price?: number | null
          paper1_qty?: number | null
          paper1_total?: number | null
          paper2_price?: number | null
          paper2_qty?: number | null
          paper2_total?: number | null
          paper3_price?: number | null
          paper3_qty?: number | null
          paper3_total?: number | null
          plate_price?: number | null
          plate_qty?: number | null
          plate_total?: number | null
          plate2_price?: number | null
          plate2_qty?: number | null
          plate2_total?: number | null
          plate3_price?: number | null
          plate3_qty?: number | null
          plate3_total?: number | null
          price_per_pcs?: number | null
          print_price?: number | null
          print_qty?: number | null
          print_total?: number | null
          print2_price?: number | null
          print2_qty?: number | null
          print2_total?: number | null
          print3_price?: number | null
          print3_qty?: number | null
          print3_total?: number | null
          quantity?: number | null
          quotation_id?: string | null
          updated_at?: string
        }
        Update: {
          binding_cost?: number | null
          binding_price?: number | null
          binding_qty?: number | null
          costing_total?: number | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          design_cost?: number | null
          design_price?: number | null
          design_qty?: number | null
          die_cutting_cost?: number | null
          die_cutting_price?: number | null
          die_cutting_qty?: number | null
          final_price?: number | null
          foil_printing_price?: number | null
          foil_printing_qty?: number | null
          foil_printing_total?: number | null
          id?: string
          invoice_id?: string | null
          job_description?: string
          lamination_cost?: number | null
          lamination_price?: number | null
          lamination_qty?: number | null
          margin_amount?: number | null
          margin_percent?: number | null
          organization_id?: string | null
          others_cost?: number | null
          others_price?: number | null
          others_qty?: number | null
          paper1_price?: number | null
          paper1_qty?: number | null
          paper1_total?: number | null
          paper2_price?: number | null
          paper2_qty?: number | null
          paper2_total?: number | null
          paper3_price?: number | null
          paper3_qty?: number | null
          paper3_total?: number | null
          plate_price?: number | null
          plate_qty?: number | null
          plate_total?: number | null
          plate2_price?: number | null
          plate2_qty?: number | null
          plate2_total?: number | null
          plate3_price?: number | null
          plate3_qty?: number | null
          plate3_total?: number | null
          price_per_pcs?: number | null
          print_price?: number | null
          print_qty?: number | null
          print_total?: number | null
          print2_price?: number | null
          print2_qty?: number | null
          print2_total?: number | null
          print3_price?: number | null
          print3_qty?: number | null
          print3_total?: number | null
          quantity?: number | null
          quotation_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_calculations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_calculations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_calculations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_calculations_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          basic_salary: number | null
          created_at: string
          department: string | null
          designation: string | null
          full_name: string
          id: string
          joining_date: string | null
          nid: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          basic_salary?: number | null
          created_at?: string
          department?: string | null
          designation?: string | null
          full_name: string
          id: string
          joining_date?: string | null
          nid?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          basic_salary?: number | null
          created_at?: string
          department?: string | null
          designation?: string | null
          full_name?: string
          id?: string
          joining_date?: string | null
          nid?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quotation_items: {
        Row: {
          created_at: string
          description: string
          discount: number | null
          id: string
          organization_id: string | null
          quantity: number
          quotation_id: string
          total: number
          unit: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          discount?: number | null
          id?: string
          organization_id?: string | null
          quantity?: number
          quotation_id: string
          total: number
          unit?: string | null
          unit_price: number
        }
        Update: {
          created_at?: string
          description?: string
          discount?: number | null
          id?: string
          organization_id?: string | null
          quantity?: number
          quotation_id?: string
          total?: number
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          discount: number | null
          id: string
          notes: string | null
          organization_id: string | null
          quotation_date: string
          quotation_number: string
          status: Database["public"]["Enums"]["quotation_status"] | null
          subtotal: number
          tax: number | null
          total: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount?: number | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          quotation_date?: string
          quotation_number: string
          status?: Database["public"]["Enums"]["quotation_status"] | null
          subtotal?: number
          tax?: number | null
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount?: number | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          quotation_date?: string
          quotation_number?: string
          status?: Database["public"]["Enums"]["quotation_status"] | null
          subtotal?: number
          tax?: number | null
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_advances: {
        Row: {
          amount: number
          created_at: string
          date: string
          deducted_from_month: number | null
          deducted_from_year: number | null
          id: string
          reason: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date?: string
          deducted_from_month?: number | null
          deducted_from_year?: number | null
          id?: string
          reason?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          deducted_from_month?: number | null
          deducted_from_year?: number | null
          id?: string
          reason?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      salary_records: {
        Row: {
          advance: number | null
          basic_salary: number
          bonus: number | null
          created_at: string
          deductions: number | null
          employee_id: string | null
          id: string
          month: number
          net_payable: number
          notes: string | null
          overtime_amount: number | null
          overtime_hours: number | null
          paid_date: string | null
          status: string | null
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          advance?: number | null
          basic_salary: number
          bonus?: number | null
          created_at?: string
          deductions?: number | null
          employee_id?: string | null
          id?: string
          month: number
          net_payable: number
          notes?: string | null
          overtime_amount?: number | null
          overtime_hours?: number | null
          paid_date?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          advance?: number | null
          basic_salary?: number
          bonus?: number | null
          created_at?: string
          deductions?: number | null
          employee_id?: string | null
          id?: string
          month?: number
          net_payable?: number
          notes?: string | null
          overtime_amount?: number | null
          overtime_hours?: number | null
          paid_date?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "salary_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          organization_id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          updated_at: string
          user_limit: number | null
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
          user_limit?: number | null
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
          user_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_by: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          organization_id: string | null
          priority: Database["public"]["Enums"]["task_priority"] | null
          reference_id: string | null
          reference_type: string | null
          status: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          organization_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          reference_id?: string | null
          reference_type?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          organization_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          reference_id?: string | null
          reference_type?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_bills: {
        Row: {
          amount: number
          bill_date: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          organization_id: string | null
          status: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          amount: number
          bill_date?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id?: string | null
          status?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          amount?: number
          bill_date?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id?: string | null
          status?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_bills_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_bills_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_payments: {
        Row: {
          amount: number
          bill_id: string | null
          created_at: string
          id: string
          notes: string | null
          organization_id: string | null
          payment_date: string
          payment_method: string | null
          vendor_id: string
        }
        Insert: {
          amount: number
          bill_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          payment_date?: string
          payment_method?: string | null
          vendor_id: string
        }
        Update: {
          amount?: number
          bill_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          payment_date?: string
          payment_method?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_payments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "vendor_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_payments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          bank_info: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          bank_info?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          bank_info?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_overdue_invoices: { Args: never; Returns: undefined }
      generate_billing_invoice_number: { Args: never; Returns: string }
      generate_challan_number: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      generate_quotation_number: { Args: never; Returns: string }
      get_org_usage_stats: {
        Args: { _org_id: string }
        Returns: {
          expense_total: number
          invoice_count: number
          last_activity: string
        }[]
      }
      get_user_org_role: {
        Args: { _org_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["org_role"]
      }
      get_user_organization_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_privileged_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_manager: { Args: { _user_id: string }; Returns: boolean }
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      is_subscription_active: { Args: { _org_id: string }; Returns: boolean }
      user_belongs_to_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_active_subscription: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "employee"
        | "super_admin"
        | "graphic_designer"
        | "manager"
        | "accounts"
        | "sales_staff"
      attendance_status: "present" | "absent" | "late" | "half_day"
      invoice_status: "unpaid" | "partial" | "paid"
      leave_status: "pending" | "approved" | "rejected"
      leave_type: "casual" | "sick" | "annual" | "other"
      org_role: "owner" | "manager" | "accounts" | "staff"
      quotation_status: "pending" | "accepted" | "rejected"
      subscription_plan: "free" | "basic" | "pro" | "enterprise"
      subscription_status:
        | "trial"
        | "active"
        | "suspended"
        | "cancelled"
        | "expired"
      task_priority: "low" | "medium" | "high"
      task_status:
        | "todo"
        | "in_progress"
        | "completed"
        | "design"
        | "plate"
        | "printing"
        | "lamination"
        | "die_cutting"
        | "binding"
        | "packaging"
        | "delivered"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "employee",
        "super_admin",
        "graphic_designer",
        "manager",
        "accounts",
        "sales_staff",
      ],
      attendance_status: ["present", "absent", "late", "half_day"],
      invoice_status: ["unpaid", "partial", "paid"],
      leave_status: ["pending", "approved", "rejected"],
      leave_type: ["casual", "sick", "annual", "other"],
      org_role: ["owner", "manager", "accounts", "staff"],
      quotation_status: ["pending", "accepted", "rejected"],
      subscription_plan: ["free", "basic", "pro", "enterprise"],
      subscription_status: [
        "trial",
        "active",
        "suspended",
        "cancelled",
        "expired",
      ],
      task_priority: ["low", "medium", "high"],
      task_status: [
        "todo",
        "in_progress",
        "completed",
        "design",
        "plate",
        "printing",
        "lamination",
        "die_cutting",
        "binding",
        "packaging",
        "delivered",
      ],
    },
  },
} as const
