import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

function CategoryCard({ name, bgColor, textColor }) {
  return (
    <Card className={`${bgColor} p-6 text-center shadow-md hover:shadow-xl transition-shadow duration-300 ease-in-out cursor-pointer`}>
      <CardContent className="p-0">
        <h3 className={`text-2xl font-bold ${textColor}`}>{name}</h3>
      </CardContent>
    </Card>
  );
}

export default CategoryCard;