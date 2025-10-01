import React, {useEffect, useState} from 'react';
import { Loader2 } from 'lucide-react';


export default function Dashboard({ text = 'Loading...'}) {
return (
  <div className="flex items-center justify-center h-full">
      <Loader2 className="animate-spin text-orange-500" size={32} />
      <p className="ml-2 text-gray-700 font-medium">{text}</p>
    </div>
)};
