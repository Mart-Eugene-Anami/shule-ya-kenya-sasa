
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

interface PaginationOptions {
  pageSize: number;
  pageIndex: number;
}

interface DataQueryOptions<T> extends Omit<UseQueryOptions<T[], unknown, T[], any>, 'queryKey' | 'queryFn'> {
  tableName: keyof Database['public']['Tables'] | string;
  columns?: string;
  filterColumn?: string;
  filterValue?: string | number | boolean;
  schoolId?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  pagination?: PaginationOptions;
  includeCount?: boolean;
}

// Field mapping for database to frontend transformation
const fieldMappings: Record<string, Record<string, string>> = {
  exams: {
    start_date: 'startDate',
    end_date: 'endDate',
    school_id: 'schoolId',
    created_by: 'createdBy',
    created_at: 'createdAt',
    term_id: 'termId',
    is_active: 'isActive'
  },
  grades: {
    school_id: 'schoolId',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
    is_active: 'isActive',
    academic_year_id: 'academicYearId',
    grade_code: 'gradeCode'
  },
  students: {
    school_id: 'schoolId',
    grade_id: 'gradeId',
    stream_id: 'streamId',
    user_id: 'userId',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
    date_of_birth: 'dateOfBirth',
    enrollment_date: 'enrollmentDate',
    student_number: 'studentNumber',
    admission_no: 'admissionNo',
    guardian_name: 'guardianName',
    guardian_phone: 'guardianPhone',
    guardian_email: 'guardianEmail'
  },
  teachers: {
    school_id: 'schoolId',
    user_id: 'userId',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
    hire_date: 'hireDate',
    teacher_number: 'teacherNumber',
    employment_type: 'employmentType',
    subjects_taught: 'subjectsTaught',
    is_stream_teacher: 'isStreamTeacher',
    stream_id: 'streamId',
    academic_year_id: 'academicYearId'
  }
};

// Transform database object to frontend object
function transformObject(obj: any, tableName: string): any {
  const mapping = fieldMappings[tableName];
  if (!mapping) return obj;

  const transformed: any = { ...obj };
  
  Object.entries(mapping).forEach(([dbField, frontendField]) => {
    if (obj[dbField] !== undefined) {
      transformed[frontendField] = obj[dbField];
      delete transformed[dbField];
    }
  });

  return transformed;
}

/**
 * A custom hook for fetching data with caching, filtering, and pagination
 * Optimized for handling large datasets across multiple schools
 */
export function useDataQuery<T>({
  tableName,
  columns = '*',
  filterColumn,
  filterValue,
  schoolId,
  orderBy,
  orderDirection = 'asc',
  pagination,
  includeCount = false,
  ...queryOptions
}: DataQueryOptions<T>) {
  const [totalCount, setTotalCount] = useState<number>(0);
  
  // Generate a unique query key based on all parameters
  const queryKey = [
    tableName,
    columns,
    filterColumn,
    filterValue,
    schoolId,
    orderBy,
    orderDirection,
    pagination?.pageSize,
    pagination?.pageIndex
  ];
  
  // The query function
  const queryFn = useCallback(async () => {
    // Start building the query
    const selectOptions = includeCount ? { count: 'exact' as const } : undefined;
    let query = supabase
      .from(tableName as any)
      .select(columns, selectOptions);
    
    // Apply school filter if provided - this is crucial for RLS
    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }
    
    // Apply additional filters
    if (filterColumn && filterValue !== undefined) {
      query = query.eq(filterColumn, filterValue);
    }
    
    // Apply sorting
    if (orderBy) {
      query = query.order(orderBy, { ascending: orderDirection === 'asc' });
    }
    
    // Apply pagination if provided
    if (pagination) {
      const { pageSize, pageIndex } = pagination;
      const start = pageIndex * pageSize;
      
      query = query.range(start, start + pageSize - 1);
    }
    
    // Execute the query
    const { data, error, count } = await query;
    
    if (error) {
      console.error(`Error fetching ${tableName}:`, error);
      throw error;
    }
    
    if (includeCount && count !== null) {
      setTotalCount(count);
    }
    
    
    
    // Transform the data to match frontend types
    const transformedData = data?.map(item => transformObject(item, tableName as string)) || [];
    
    return transformedData as T[];
  }, [tableName, columns, filterColumn, filterValue, schoolId, orderBy, orderDirection, pagination, includeCount]);
  
  // Use TanStack Query for caching and state management
  const result = useQuery<T[], unknown, T[]>({
    queryKey,
    queryFn,
    enabled: !!schoolId, // Require schoolId for all queries
    ...queryOptions
  });
  
  return {
    ...result,
    totalCount
  };
}
