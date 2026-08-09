## Frontend (JSX) Untranslated Strings
**App.jsx**
- `)
    }

    return (`
- `Te rugăm să reîncarci pagina.`
- `Reîncarcă Pagina`
- `Le lien que vous avez visité n'est pas valide ou l'entreprise a été supprimée du système. / De link die u hebt bezocht is ongeldig of het bedrijf is uit het systeem verwijderd.`
- `Lien introuvable ou expiré`
- `) : null}`
- `Chargement...`
- `}
    return`
- `L'entreprise n'existe pas / Bedrijf bestaat niet`
- `A apărut o eroare de navigare.`
- `}

    // Otherwise, show a generic 404 to avoid leaking employee interfaces
    return (`
- `Veuillez vérifier l'adresse web que vous avez saisie ou contactez-nous si vous pensez qu'il s'agit d'une erreur.`
- `Retour à la page d'accueil / Terug naar startpagina`
- `}
        return`

**components/MiniLiveTrackingMap.jsx**
- ``;
  const chapeSvg = ``
- ``;
  const mixerSvg = ``
- `0;
                    return (`
- ``;
  const camionGrueSvg = ``
- `0 &&`
- ``;

  let selectedSvg = truckSvg;
  if (vType.includes('chape')) selectedSvg = chapeSvg;
  else if (vType.includes('beton') || vType.includes('toupie')) selectedSvg = mixerSvg;
  else if (vType.includes('grue') && vType.includes('camion')) selectedSvg = camionGrueSvg;
  else if (vType.includes('grue')) selectedSvg = craneSvg;

  const avatarHtml = fullAvatarUrl 
    ? ``
- ``;
  const craneSvg = ``

**components/DataTable.jsx**
- `) : slice.length === 0 ? (`
- `}

    return (`
- `return sortDir === 'asc'
            ?`

**components/PhotoUpload.jsx**
- `Fotografie încărcată cu succes!`
- `Încarcă Fotografie`
- `Click pentru a selecta fotografie`
- `Se încarcă...`
- `JPEG, PNG sau WebP (max 10MB)`
- `Încarcă Fotografia`
- `Descriere (opțional)`

**components/AvatarCropModal.jsx**
- `Anulează`
- `Zoom`
- `Încadrare Poză Profil`
- `Finalizează`

**components/SiteMap.jsx**
- `Toate`
- `Ore lucrate:`
- `Anul Curent`
- `Niciun santier activ in aceasta perioada`
- `!s.latitude || !s.longitude)

    return (`
- `Niciun santier cu coordonate GPS`
- `Luna Curenta`
- `Muncitori activi`
- `Status:`
- `Panouri`
- `Vehicule`
- `Activități raportate:`
- `0 && (`
- `Check-in:`
- `Putere`
- `Luna Trecuta`
- `Adauga latitudine/longitudine in Gestionare Santiere`
- `Vezi Profil Complet`
- `0 ? ``
- `Judet`
- `Geofence`
- `0 ? worker.worked_hours + 'h' : '0h'}`
- `Client`
- `s.name).join(', ')}`

**components/MapView.jsx**
- `⚠️ Adresa nu a putut fi localizată. Adaugă GPS manual în Șantiere.`
- `Se caută locația pe hartă...`
- `0 && (`
- `Nisip`

**components/EmployeeDetailView.jsx**
- `) : tx.tx_type === 'consume' ? (`
- `= 1 && dd`
- `= 1 && mm`
- `Cereri de Materiale`
- `Scanat la creare profil`
- `Utilaj / Mașină`
- `Note`
- `RETURNAT`
- `CONSUMAT`
- `Consumat`
- `Ore Overtime (estimat)`
- `Descarcă`
- `Inactiv`
- `Șantier`
- `DA`
- `Dată`
- `Nume Document`
- `Jurnale Utilaje & Auto`
- `Calculat peste 160h standard`
- `Ore luna aceasta`
- `Deschide`
- `PRELUAT DIN MAGAZIE`
- `Combustibil Luna Asta`
- `Vizualizare Document`
- `Operațiune`
- `Export Excel`
- `Litri`
- `Act oficial generat la angajare`
- `tx.tx_type === 'out') && (`
- `Vizualizare Scan`
- `A Alimentat?`
- `Articole Cerute`
- `Tip Combustibil`
- `Dată Jurnal`
- `Carte de Identitate (CI)`
- `TOTAL CONSUMAT:`
- `= 7 && s`
- `Notițe`
- `Anulare`
- `Cazare curentă`
- `0 && (`
- `Încărcare Document Nou`
- `PRELUAT`
- `Status`
- `TOTAL RETURNAT:`
- `Niciun document adițional încărcat`
- `Rezolvat La`
- `tx.tx_type === 'in') && (`
- `Nespecificat`
- `Notițe / Locație`
- `Data Cererii`
- `acc + curr.quantity, 0)} L`
- `Performanță Istorică (Ore)`
- `Articol / Sculă`
- `Ramas`
- `Nicio cerere de materiale.`
- `0 ? (`
- `Cantitate`
- `Nicio tranzacție de magazie pentru acest angajat.`
- `TOTAL PRELUAT DIN MAGAZIE (INVENTAR):`
- `Alimentări din Magazie (Motorină / Combustibil)`
- `A Muncit cu ea?`
- `Dat`
- `Fără activități înregistrate.`
- `Nu există jurnale auto înregistrate de acest angajat.`
- `Contract de Muncă`
- `Nespecificată`
- `Top Activități (Luna aceasta)`
- `RETURNAT ÎN MAGAZIE`
- `Fișier (PDF / Imagine)`
- `Activ`
- `Documente Principale`
- `Adaugă Act Nou`
- `Tranzacții Magazie (Preluat / Returnat / Consumat)`

**components/AddressAutocomplete.jsx**
- `0 && (`

**components/SiteDetailView.jsx**
- `Pauză Masă`
- `Echipe Alocate`
- `Muncitor`
- `Total:`
- `Program & Locație`
- `Informații Client & Sistem`
- `Articol`
- `Dată`
- `Nu există tranzacții în perioada selectată.`
- `selectedRows.includes(id))
                        return (`
- `Activități efectuate`
- `Nu există utilaje alocate.`
- `Check Out`
- `Intrare`
- `Utilizator`
- `Tip`
- `0 && (`
- `Data Creării`
- `Nu există fotografii încărcate.`
- `Locație pe hartă`
- `Ieșire`
- `Cantitate`
- `0 ? (`
- `Check In`
- `Program Lucru`
- `Nu există echipe sau angajați alocați acestui șantier.`
- `Angajați Individuali`
- `Activ`
- `înregistrări`
- `allIds.includes(id)).length} selectate` : ''}`

**components/WeatherWidget.jsx**
- `;
            return`
- `;
            if ([51, 53, 55, 56, 57].includes(code)) return`
- `;
            if ([45, 48].includes(code)) return`
- `;
            if ([71, 73, 75, 77, 85, 86].includes(code)) return`
- `;
    if (!data || data.error) return (`
- `;
            if ([1, 2].includes(code)) return`
- `;
        };

        return (`
- `;
            if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return`
- `;
            if ([95, 96, 99].includes(code)) return`
- `;
            if (code === 3) return`

**components/HeaderNotifications.jsx**
- `new Date(b.created_at) - new Date(a.created_at));

    return (`
- `99 ? '99+' : unreadQuotesCount}`
- `1 &&`
- `99 ? '99+' : unreadCount}`
- `0 && (`

**components/CalendarErrorBoundary.jsx**
- `Calendar Crashed!`

**components/DocumentPreviewModal.jsx**
- `1 && (`
- `0 && (`

**components/GlobalSearch.jsx**
- `;
            default: return`
- `) : !isLoading && (`
- `result.score`
- `;
            case 'devis': return`
- `;
        }
    };

    return createPortal(`
- `0 ? (`
- `;
            case 'chantier': return`

**components/BuienradarWidget.jsx**
- `setIsRefreshing(false), 1000);
    };

    return (`

**components/SearchableSelect.jsx**
- `768;

    return (`

**components/PhotoGallery.jsx**
- `Data încărcării`
- `Șterge`
- `)
    }

    return (`
- `Încărcat de`
- `Nu există fotografii încărcate.`
- `Descarcă`
- `Dimensiune`
- `Se încarcă fotografiile...`
- `Descriere`

**components/HourlyWeather.jsx**
- `;
        if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return`
- `28;
                    return (`
- `;
        if ([1, 2].includes(code)) return`
- `;
        if ([45, 48].includes(code)) return`
- `;
        if ([51, 53, 55, 56, 57].includes(code)) return`
- `0 && (`
- `;
        if ([95, 96, 99].includes(code)) return`
- `= targetHour && hourNum`
- `;
        if (code === 3) return`
- `);
    }



    return (`
- `;
        return`
- `;
        if ([71, 73, 75, 77, 85, 86].includes(code)) return`

**components/Pagination.jsx**
- `Afișează`

**components/MobileAgenda.jsx**
- `OK`
- `0 && (`
- `0;
                    
                    return (`

**components/StreetViewPhotos.jsx**
- `,
                document.body
            )}`

**components/ShortWorksCalendar.jsx**
- `,
                document.body
            )}`
- `el.removeEventListener('touchmove', handler);
    });

    return (`
- `h.date === cellDayStr);
                            
                            return (`
- `wo.status === 'completed');
                                        return (`
- `) : tenant?.logo_url ? (`
- `h.date === dayStr);

                            return (`
- `);
                                    }
                                    return null;
                                })()}`
- `0 && !holidayInfo && (`
- `0 && (`

**components/ui/ToastOverlay.jsx**
- `) : (
                        config.icon
                    )}`
- `}
    }

    const config = typeConfig[toast.type] || typeConfig.info
    const iconUrl = tenant?.favicon_url ? getImageUrl(tenant.favicon_url) : (tenant?.logo_url ? getImageUrl(tenant.logo_url) : null)

    return (`

**components/layout/EmployeeHeader.jsx**
- `state.globalTheme)

    return (`

**components/layout/EmployeeLayout.jsx**
- `) : tenant?.logo_url ? (`
- `Chat`

**components/common/CookieBanner.jsx**
- `Compris`
- `Nous utilisons uniquement des cookies strictement nécessaires pour assurer le fonctionnement technique de la plateforme et votre authentification. 
                        En continuant, vous acceptez notre`
- `Politique de Confidentialité`
- `Cookies & Confidentialité :`

**pages/History.jsx**
- `Ore, pauze și activități`
- `Activități`
- `todayStr) return
        setHistoryDate(newDateStr)
        fetchHistory(newDateStr)
    }

    return (`
- `Nu ai lucrat în această zi`
- `) : !historyData?.found ? (`
- `Istoricul Meu`
- `Terminat`
- `● Activ`
- `Niciun pontaj`
- `Ore lucrate`
- `Pauză`
- `0 && (`

**pages/DemoSignup.jsx**
- `Numele Companiei *`
- `Se creează contul...`
- `Începe Demo Gratuit`
- `Numele Tău (Admin) *`
- `Parolă Administrator *`
- `Înapoi la Autentificare`
- `Telefon (Opțional)`
- `Creează Cont Demo`
- `Ai acces complet gratuit timp de 30 de zile`
- `Email (Login Admin) *`

**pages/PublicCalculator.jsx**
- `);

    const estTotal = calculateEstimatedPrice();

    return (`
- `);
        for (let i = 1; i`
- `= minS && s`
- `));
        for (let i = 0; i`
- `);
    };

    if (loading) return (`
- `0 && (`

**pages/TodayTimesheet.jsx**
- `Pontaj Azi`
- `În dezvoltare...`

**pages/Dashboard.jsx**
- `Sistem de pontaj`
- `Acțiuni Rapide`
- `Pontaj Digital`
- `Deschide`

**pages/Login.jsx**
- `J'accepte la`
- `Système moderne de gestion d'entreprise`
- `}

    return (`
- `Cette application collecte vos données de localisation pendant les heures de travail pour assurer le pointage et la gestion des chantiers.`
- `Avis GPS :`
- `Code PIN oublié ?`
- `Une solution de`
- `getapp.ro`
- `Powered by Smart Timesheet`
- `Politique de Confidentialité`
- `Code PIN (4 chiffres)`
- `Se connecter`
- `Code Employé`

**pages/WorkspaceRouter.jsx**
- `Workspace (Nume Companie)`
- `Nu ai un cont pentru compania ta?`
- `Bine ai venit`
- `Continuă`
- `Te rugăm să introduci codul companiei tale`
- `Începe un Demo de 30 de zile gratuit`

**pages/DevisOnline.jsx**
- `);

    const estTotal = calculateEstimatedPrice();

    return (`
- `);
        for (let i = 1; i`
- `= minS && s`
- `));
        for (let i = 0; i`
- `);
    };

    if (loading) return (`
- `0 && (`

**pages/admin/PricingSettingsPage.jsx**
- `)
    }

    return (`
- `) : (
                                editingClientId && (`
- `) : clientSettings ? (`
- `, document.body)}`
- `Ce client utilise actuellement les paramètres globaux. Modifiez les prix ci-dessous et enregistrez pour créer une tarification personnalisée.`
- `Chargement des paramètres...`

**pages/admin/IsoflexHistory.jsx**
- `1) && (`
- `},
    ]

    return (`
- `0 && (`
- `row.in_db
                ?`

**pages/admin/InvoiceDetails.jsx**
- `Devis (estimatif):`
- `Devis PDF`
- `) : wo.is_quote && wo.status === 'planning' ? (`
- `) : isGenerated ? (`
- `N° Facture`
- `Date Devis`
- `0 ? devisTotalWithVat.toFixed(2) : netTotal.toFixed(2)}`
- `N° Devis`
- `: (wo.billtobox_status === 'sent' ?`
- `TOTAL NET À PAYER:`
- `DÉTAILS D'ÉMISSION`
- `Devis Planifié`
- `RÉSUMÉ FINANCIER`
- `Facture (réel):`
- `) : wo.proforma_path ? (`
- `Date Facture`
- `0 && (`
- `0 ? devisTotalWithVat.toFixed(2) : netTotal.toFixed(2))}`

**pages/admin/PricingSettingsForm.jsx**
- `Min m²`
- `Taxe (€)`
- `Max m²`

**pages/admin/ScreedsReports.jsx**
- `},
    ]

    return (`
- `) : charts.validWos === 0 ? (`
- `= startStr && d`

**pages/admin/WorkOrderDetail.jsx**
- `) : null}
                                Chat`
- `,
                document.body
            )}`
- `Billtobox`
- `0) && (`
- `Răspunde clientului`
- `1 && (`
- `Clientul a solicitat reprogramarea`
- `Ouvrir en plein écran`
- `)
    if (!wo) return (`
- `Google`
- `Waze`
- `0) ? (`
- `sum + (seg.km || 0), 0) * 2).toFixed(1)} km`
- `) : (
                            !wo.estimated_price &&`
- `window.removeEventListener('keydown', handler);
    }, [lightbox, photos.length]);

    if (loading) return (`
- `0 &&`
- `FACTURE`
- `0 && (`
- `!v.has_foil && !v.has_mesh && !v.has_duramint && !v.has_fiber && !v.has_sound_insulation && !v.has_floor_heating_add) && (`
- `) : wo.source_system === 'robaws' ? (`
- `0 ? (`
- `0.00&nbsp;EUR`
- `: (wo?.billtobox_status === 'sent' ?`
- `Apple`
- `DEVIS`
- `) : wo.source_system === 'devis_online' ? (`

**pages/admin/ExpensesManagement.jsx**
- `) : expenses.length === 0 ? (`
- `) : formData.document_url ? (`
- `acc + (curr.amount || 0), 0)

    return (`

**pages/admin/WorkOrderCalculations.jsx**
- `)
            }
        }
    ]

    return (`

**pages/admin/AccommodationsManagement.jsx**
- `selectedUserIds.includes(u.id))
                    return (`
- `)
    }

    // ─── LIST VIEW ─────────────────────────────────────────────────────────────
    return (`
- `) : paginated.length === 0 ? (`
- `selectedUserIds.includes(u.id))
                return (`
- `0 && (`

**pages/admin/EmailLogs.jsx**
- `,
                document.body
            )}`
- `(
                row.status === 'sent' ? (`
- `)
        }
    ], [t])

    return (`

**pages/admin/ClientsManagement.jsx**
- `) : filteredClients.length === 0 ? (`
- `🇳🇱 Nederlands`
- `🇷🇴 Română`
- `SWIFT`
- `, document.body)}`
- `IBAN`
- `🇩🇪 Deutsch`
- `Nederland`
- `🇫🇷 Français`
- `United Kingdom`
- `🇷🇺 Русский`
- `🇬🇧 English`
- `España`
- `Belgique`
- `Italia`
- `France`
- `România`
- `Deutschland`
- `: "KBO"}`

**pages/admin/AdminDashboard.jsx**
- `99 ? '99+' : item.badge}`
- `) : tenant?.logo_url ? (`
- `) : null}`
- `Chat`
- `99 ? '99+' : openComplaintsCount}`
- `0 && (`

**pages/admin/AuditLogs.jsx**
- `}
    ]

    return (`

**pages/admin/TeamsManagement.jsx**
- `u.id !== newLeader).length === 0 ? (`
- `!globalSearch || t.name.toLowerCase().includes(globalSearch.toLowerCase()) || (t.team_leader_name && t.team_leader_name.toLowerCase().includes(globalSearch.toLowerCase())))

    return (`
- `user.id === id);
                                            if (!u) return null;
                                            return (`
- `(
                team.site_name ? (`
- `0 && (`

**pages/admin/WorkOrderForm.jsx**
- `) : (
                                /* EDIT MODE — compact inline fields */`
- `🇫🇷 FR`
- `— client —`
- `🇳🇱 NL`
- `0) && (`
- `1 && (`
- `) : form.site_address ? (`
- `0.00&nbsp;EUR`
- `Ajouter photo`
- `🇷🇺 RU`
- `🇬🇧 EN`
- `= t.min_sqm && surfaceForAuto`
- `0 && (`
- `🇷🇴 RO`
- `🇩🇪 DE`

**pages/admin/GpsHistoryTab.jsx**
- `0 ? (`
- `)
            )
        }
    ]

    return (`
- `0 && !loading && (`

**pages/admin/TimesheetApprovalPage.jsx**
- `)
        }
    ]

    return (`
- `)
    }
    return (`
- `}
    return`
- `0 &&`
- `) : workerDetail ? (`
- `1 && (`
- `0 ? (`
- `0 && (`

**pages/admin/ImportInvoiceModal.jsx**
- `Debug Text OCR`
- `it.id !== id)
        }))
    }

    return (`

**pages/admin/PhotoTestPage.jsx**
- `• Dimensiune maximă: 10MB per fotografie`
- `prev + 1)
    }

    return (`
- `• Se creează automat thumbnail-uri de 300x300px`
- `• Formate acceptate: JPEG, PNG, WebP`
- `• Imaginile sunt redimensionate automat la max 1920x1080`
- `Înapoi la Dashboard`
- `💡 Acest ID va fi folosit pentru a asocia fotografiile cu un pontaj specific`
- `/backend/uploads/sites/`
- `Test Încărcare Fotografii`
- `ℹ️ Informații`
- `Timesheet ID (pentru test)`
- `• Fotografiile sunt salvate în`
- `Testează funcționalitatea de upload pentru pontaje`

**pages/admin/InvoicingManagement.jsx**
- `,
                document.body
            )}`
- `0) && (`
- `🇷🇴 Roumain`
- `0 || statusFilter) && (`
- `Réel`
- `!w.is_invoiced && (w.is_quote || w.proforma_path)).length}`
- `0 && !selectedTeams.includes(wo.assigned_team_name)) return false
        if (statusFilter === 'unfactured' && (wo.is_invoiced || wo.proforma_path || (wo.is_quote && wo.status === 'planning'))) return false
        if (statusFilter === 'proforma' && !wo.proforma_path) return false
        if (statusFilter === 'invoiced' && !wo.is_invoiced) return false
        if (statusFilter === 'quote' && !(wo.is_quote && wo.status === 'planning')) return false
        return true
    })

    return (`
- `🇳🇱 Néerlandais`
- `Confirmé client`
- `0 &&`
- `🇫🇷 Français`
- `✕ Reset`
- `)
                }
                return (`
- `w.is_invoiced).length}`
- `return (`
- `🇬🇧 Anglais`
- `🇩🇪 Allemand`
- `: (pdfPreviewUrl.wo?.billtobox_status === 'sent' ?`
- `Devis Planifié`
- `w.billtobox_status === 'sent').length}`

**pages/admin/WorkOrders.jsx**
- `,
                document.body
            )}`
- `) : null}`
- `) : sessionsModal.data.error ? (`
- `) : wo.status === 'completed' ? (`
- `)
        }
        const link = getLink(wo)
        return (`
- `}

                return (`
- `0 && (`

**pages/admin/OrganizationsManagement.jsx**
- `Acțiuni`
- `Nom de l'entreprise *`
- `🇷🇴 Roumain (RO)`
- `Companie`
- `🇫🇷 Français (FR)`
- `Admini locali`
- `Standard`
- `Couleur Principale`
- `Anulează`
- `Statut du compte`
- `🇷🇴 Roumanie`
- `Nume Complet *`
- `Actualizează Parola`
- `, document.body)}`
- `Domeniu / Slug`
- `Sous-domaine`
- `Adminii locali pot gestiona`
- `doar`
- `Favicon`
- `ℹ️ Notă:`
- `Rol`
- `🇩🇪 Allemagne`
- `🇬🇧 Anglais (EN)`
- `🇧🇪 Belgique`
- `Ajouter Admin`
- `) : org.slug ? (`
- `Modules Fonctionnels`
- `Forfait`
- `Parola Veche *`
- `Ajouter`
- `🇲🇩 Russe (RU)`
- `Pays par défaut (Carte)`
- `) : orgAdmins.length === 0 ? (`
- `Creează Admin`
- `🇳🇱 Néerlandais (NL)`
- `Status`
- `Ajouter primul administrator pentru această companie.`
- `Parolă *`
- `Nu am găsit companii.`
- `Fuseau horaire`
- `Admin Nou Local`
- `🇩🇪 Allemand (DE)`
- `Schimbă Parola Admin`
- `) : formData.logo_url ? (`
- `) : filteredOrgs.length === 0 ? (`
- `Logo`
- `🇫🇷 France`
- `Admini configurați`
- `Roumanie (Bucarest)`
- `.pontaj.app`
- `Allemagne (Berlin)`
- `Niciun admin local`
- `Limite d'utilisateurs`
- `Auto (Heure locale du visiteur)`
- `Confirmă Parola *`
- `Custom Domain`
- `Langue par défaut`
- `Email *`
- `Noua Parolă *`
- `🇳🇱 Pays-Bas`

**pages/admin/AdminOverview.jsx**
- `clearInterval(t)
    }, [])


    return (`
- `🇮🇹 IT`
- `,
                document.body
            )}`
- `1 ? 's' : ''}`
- `🇭🇷 HR`
- `0) && (`
- `🇸🇪 SE`
- `Discount / Réduction (€) (Optionnel)`
- `= startOfWeek && d`
- `= 0 ?`
- `🇩🇪 DE`
- `) : fleetAlerts.length === 0 && (`
- `0 && createPortal(`
- `🇮🇪 IE`
- `);
                                        }
                                        return null;
                                    })()}`
- `🇬🇧 GB`
- `3 && (`
- `· 0km`
- `0 &&`
- `🇪🇸 ES`
- `🇸🇰 SK`
- `0 && (`
- `🇩🇰 DK`
- `🇧🇪 BE`
- `🇫🇷 FR`
- `) : quote.source_system === 'devis_online' ? (`
- `10 ani)')}`
- `🇦🇹 AT`
- `🇭🇺 HU`
- `wo.status === 'completed' ? (
                                            wo.is_invoiced ? (`
- `Adresse:`
- `🇫🇮 FI`
- `)
                    }
                ]

                return (`
- `🇨🇿 CZ`
- `🇱🇺 LU`
- `) : workerDetail ? (`
- `0 ? (`
- `🇵🇹 PT`
- `🇷🇴 RO`
- `🇳🇱 NL`
- `) : quickRouteLoading ? (`
- `)
    }
    return (`
- `= startOfMonth && d`
- `🇧🇬 BG`
- `🇵🇱 PL`
- `}
    return`
- `Client:`
- `🇬🇷 GR`
- `= 2 && clientSearchResults.length === 0 && placesSearchResults.length === 0 && !isSearchingClients && (`
- `: "KBO"}`

**pages/admin/SettingsPage.jsx**
- `Configurează aplicația`
- `DD/MM/YYYY (17/02/2026)`
- `Logo Organizație`
- `Telefon`
- `Enregistrer Setările`
- `Notificări pentru pontaje neaprobate`
- `Setări Sistem`
- `Europe/Bucharest (GMT+2)`
- `Notificări Respingere`
- `Setări Pontaje`
- `Notificări Email`
- `⚙️ Setări`
- `Alege ce module vrei să vezi pe prima pagină și ce dimensiune să aibă.`
- `Setări Notificări`
- `24 ore (14:30)`
- `Fus Orar`
- `Formate: JPG, PNG, SVG, WebP. Max 2MB.`
- `Informații Organizație`
- `Primește notificări pe email`
- `YYYY-MM-DD (2026-02-17)`
- `Europe/London (GMT+0)`
- `Limbă`
- `Durată Pauză (minute)`
- `Email Contact`
- `Oră Start Implicit`
- `Nume Companie`
- `Format Oră`
- `MM/DD/YYYY (02/17/2026)`
- `America/New_York (GMT-5)`
- `12 ore (2:30 PM)`
- `Oră Sfârșit Implicit`
- `Auto-aprobare pentru manageri`
- `Română`
- `Alege fișier`
- `Aspect Dashboard`
- `Obligă încărcarea fotografiilor`
- `Mărime:`
- `Format Dată`
- `Anunță angajații când pontajele sunt respinse`
- `English`
- `Reminder-uri Aprobare`

**pages/admin/AlertsManagement.jsx**
- `) : alerts.length === 0 ? (`

**pages/admin/FleetManagement.jsx**
- `s + r.days_used, 0)}`
- `return (`
- `)
        }
    ]

    return (`
- `0 ? (`
- `s.id === id)).filter(Boolean)
                if (vehicleSites.length === 0) return`
- `if (vehicleSites.length === 1) return`
- `v.imei ?`
- `u.id === id)).filter(Boolean)
                if (uList.length === 0) return`
- `(
                                u.avatar_path ? (`
- `) : reportData.length === 0 ? (`
- `s + r.total_fuel_liters, 0).toFixed(1)} L`
- `s + r.days_idle, 0)}`
- `, document.body
            )}`
- `1 && (`
- `s + r.refuel_events, 0)}`
- `)
                }

                return (`
- `0 && (`

**pages/admin/AdminChats.jsx**
- `TR:`
- `1 ? users.length : ''}`
- `🇫🇷 FR`
- `DC`
- `🇳🇱 NL`
- `🌐 Traducere:`
- `)
                                                                    ) : null}`
- `) : messages.length === 0 ? (`
- `(c.client_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.title.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (`
- `) : filteredChats.length === 0 ? (`
- `🇬🇧 EN`
- `Fără trad.`
- `0 && (`
- `) : msg.sender === 'admin' ? (
                                                                        (tenant?.favicon_url || tenant?.logo_url) ? (`

**pages/admin/AdminLogin.jsx**
- `Une solution de`
- `Conditions Générales de Vente`
- `Email`
- `J'accepte les`
- `, la`
- `state.getCurrentSubdomain())

    return (`
- `Accord de Traitement des Données (DPA)`
- `Politique de Confidentialité`
- `Powered by Smart Timesheet`
- `et l'`
- `getapp.ro`

**pages/admin/LiveTracking.jsx**
- `120;
            return (`
- `Auto-refresh à 30s`
- `0
    ? [vehicles[0].lat, vehicles[0].lng]
    : [50.85045, 4.34878]; // Brussels default

  return (`
- `GPS Flespi`
- `Stations de Sable`
- `Sable`
- `Live Tracking`
- `) : (
                            v.vehicle_type === 'Grue' ? (`
- `-- km`
- `0 &&`
- `0 && !isMapFull && (`
- `0 && (`

**pages/admin/DevisView.jsx**
- `Cachet / Signature`
- `= minS && surfCheck`
- `Total Net (HTVA)`
- `TVA non appliquée`
- `0.00 €`
- `if (error || !wo) return`
- `) : (wo?.final_client_signature || wo?.client_signature) ? (`
- `Accepté en ligne`
- `Spacer`
- `Date: _______________`
- `(sans signature manuscrite)`
- `Imprimer / PDF`
- `0 && (`
- `Retour`

**pages/admin/AdminEmergencies.jsx**
- `c.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.site_name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    const totalPages = Math.ceil(filtered.length / itemsPerPage)
    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    return (`
- `0 && (`
- `) : paginated.length === 0 ? (`

**pages/admin/WarehouseManagement.jsx**
- `selectedIds.includes(o.id))

    return (`
- `Status:`
- `0) ? (`
- `t.transaction_type === 'OUT').slice(-1)[0]
    const isFromWorkerRequest = lastOutTx?.notes?.includes('Flux Cerere')

    return (`
- `o.id === selectedId)

    return (`
- `v.site_ids && v.site_ids.includes(txForm.site_id)) 
                                                    : vehicles;
                                                return (`
- `) : paginatedItems.length === 0 ? (`
- `0 ? (`
- `0 && (`

**pages/admin/AdminMaterialRequests.jsx**
- `c.items_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.site_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.notes?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    const totalPages = Math.ceil(filtered.length / itemsPerPage)
    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    return (`
- `0 && (`
- `) : paginated.length === 0 ? (`

**pages/admin/EmployeesManagement.jsx**
- `) : loading ? (`
- `Toate Rolurile`
- `) : preferences.viewMode === 'list' ? (`
- `) : null}`
- `0 && selectedUserIds.length === users.length
    return (`
- `Consentement RGPD`
- `RGPD ✓`
- `0 && (`

**pages/admin/NotificationsPage.jsx**
- `)
    }
    return (`
- `) : filtered.length === 0 ? (`

**pages/admin/UsersManagement.jsx**
- `) : paginatedUsers.length === 0 ? (`
- `) : null}`
- `,
                document.body
            )}`
- `0 && (`

**pages/admin/ProformaView.jsx**
- `if (!wo) return`
- `= minS && surfCheck`
- `0 ? (`
- `TVA: BE 0785.292.895`
- `TVA: BE0785292895`
- `À L'ATTENTION DE`
- `Téléphone: 0493.37.07.77 | Email: info@davidechape.be`
- `IBAN: BE46363221149936 | BIC: BBRUBEBB`
- `Flandre, Belgique`
- `(SRL)`
- `0,00 EUR`
- `TVA`
- `Gemeentehuisstraat 27/5, 1740 Ternat`
- `0 && (`
- `IBAN: BE97733069599449 | BIC: KREDBEBB`

**pages/admin/QuotesManagement.jsx**
- `v.has_foil) && (`
- `)
    }

    return (`
- `Cm`
- `Total Est. (€)`
- `Aucun volume`
- `)
                    return null
                }
                return (`
- `}
                                Planifier`
- `Inclure Treillis métallique`
- `Planifier dans le calendrier`
- `v.has_fiber || v.has_duramint) && (`
- `Annuler`
- `21% Nou`
- `Équipe (optionnel)`
- `M²`
- `)
                    if (src === 'devis_online') return (`
- `Inclure Duramint`
- `PDF`
- `TVA`
- `)
                    if (src === 'manual') return (`
- `= t.min_sqm && surfaceForAuto`
- `0 && (`
- `Planifier`
- `Net`
- `v.has_mesh) && (`
- `)
                    if (src === 'robaws') return (`
- `0 && discountPct`
- `Heure de début`
- `) : row.source_system === 'devis_online' ? (`
- `Date *`
- `0% BTW`
- `Total Est.`
- `}
                                Enregistrer les modifications`
- `— Sans équipe —`
- `Inclure Film plastique`
- `6% Renov.`
- `Modifier le Devis`
- `Inclure Fibre`

**pages/admin/ComplaintsManagement.jsx**
- `c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.content?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    const totalPages = Math.ceil(filtered.length / itemsPerPage)
    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    return (`
- `0 && (`
- `) : paginated.length === 0 ? (`

**pages/admin/TransportManagement.jsx**
- `0 ? (`
- `0) && (`
- `) : trips.length === 0 ? (`

**pages/admin/SitePhotosPage.jsx**
- `Acțiuni`
- `Data`
- `Descarcă`
- `Șantier`
- `1 && (`
- `Supprimer`
- `Ajouter descriere`
- `}
                                Selectează tot`
- `) : photo.description ? (`
- `Poze Șantier`
- `0
                                    ?`
- `Descriere`
- `0 && (`
- `Încărcat de`
- `Toate șantierele`
- `0
                                                ?`
- `) : viewMode === 'grid' ? (
                    /* ─── GRID VIEW ─── */`
- `) : (
                    /* ─── LIST VIEW ─── */`
- `Poză`
- `) : photos.length === 0 ? (`

**pages/admin/ImportInvoice.jsx**
- `it.id !== id)
        }))
    }

    return (`

**pages/admin/ActivitiesManagement.jsx**
- `ore`
- `m (metri)`
- `!a.is_active).length

    const PRESET_COLORS = [
        '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
        '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1',
        '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
        '#64748b'
    ]

    return (`
- `kg (kilograme)`
- `buc/set`

**pages/admin/ReportsPage.jsx**
- `) : !preview ? (`
- `)
        }}
    ]

    return (`
- `}

    return`
- `) : preview && charts ? (`
- `) : !loading && null}`

**pages/admin/SitesManagement.jsx**
- `s.urgency === 'urgent' || s.urgency === 'overdue').length}`
- `)
    }

    return (`
- `)
        return (`
- `) : workOrders.length === 0 ? (`
- `)
        if (status === 'completed') return (`
- `0 && (`

**pages/admin/logistics/LogisticsReport.jsx**
- `km`
- `) : rows.length === 0 ? (`
- `s + (r.route_distance_km || 0), 0)
                                        return (`
- `m²`
- `vb ? -1 : va`
- `) : error ? (`
- `)

    return (`
- `0 ?`
- `0 &&`
- `1 && (`
- `cm`

**pages/admin/logistics/GpsVerificationPage.jsx**
- `km`
- `Infractions`
- `km/h`
- `70-90`
- `Vérif. GPS`
- `Defaut/Autoroute:`
- `= 2 && (`
- `2 km/h
                            let drivingMin = 0
                            let distKm = 0
                            let maxSpeed = 0

                            for (let j = 0; j`
- `Chargement route...`
- `Vitesse Max`
- `Fermer`
- `0.3)

                        if (filteredData.length === 0) return null

                        return (`
- `0 && (`
- `Base`
- `[p.lat, p.lng]);
        displayStartPoint = [first.lat, first.lng];
        displayEndPoint = [last.lat, last.lng];
        displayStartTime = first.time_local;
        displayStartSpeed = first.speed;
        displayEndTime = last.time_local;
        displayEndSpeed = last.speed;
    }

    return (`
- `0).length

    return (`
- `0 ? (`
- `0 ? result.track[result.track.length - 1] : null;
    const isRecentlyUpdated = lastPoint ? (Date.now() / 1000 - lastPoint.ts)`
- `);
                                    return isMapFullscreen ? createPortal(mapContent, document.body) : mapContent;
                                })()
                            )}`
- `Voir tout le parcours`
- `&lt;30 km/h`
- `&gt;90 km/h`
- `Distance`
- `30-70`

**pages/admin/logistics/SandStationsPage.jsx**
- `Hartă`
- `Stații de Nisip`
- `} Enregistrer`
- `Tabel Stații Nisip`
- `Legendă Stații`
- `Adresă / Căutare pe Hartă`
- `Latitudine GPS`
- `}
                                        Detectează`
- `Longitudine GPS`
- `Ajouter Stație`
- `Nume *`
- `)
                    }
                ]
                
                return (`
- `Anulare`
- `Gestionează stațiile de la care se încarcă nisip/agregate.`
- `Tabel`

**pages/admin/logistics/BasesPage.jsx**
- `Niciunul`
- `return (`
- `(row.team_ids || []).includes(t.id))
                            if (baseTeams.length === 0) return`
- `v.user_ids?.includes(t.team_leader_id))
                                        return (`
- `)
                    }
                ]
                
                return (`
- `v.user_ids?.includes(team.team_leader_id))
                                            return (`

**pages/admin/logistics/LogisticsDashboard.jsx**
- `km`
- `Vérif. GPS`
- `[p.lat, p.lng]);
                                                const lastPos = route.gps_trace[route.gps_trace.length - 1];
                                                return (`
- `) : null}`
- `) : !data ? (`
- `)
                                                            }
                                                            return null;
                                                        })()}`
- `⚠️ Comenzile nu au coordonate GPS`
- `!wp.type?.includes('base'))
                                const hasOnlyBase = workWps.length === 0

                                return (`
- `0 &&`
- `0 && (`
- `[p[0] + 0.00015, p[1] + 0.00015])
    return`
- `p?.join(',')).join('|')])

    if (!positions || positions.length`
- `1 && !hasOnlyBase && (`
- `Écart GPS`
- `0 ? (`
- `● Station de Sable`
- `)
    }
    return (`
- `Stations de Sable`
- `)
                                            }

                                            return (`
- `Dernière position GPS`
- `wp.type === 'work');
                                        const totalTons = (route.total_sand_kg || 0) / 1000;
                                        const isFocused = focusedTeamId === route.team_id;
                                        const isDimmed = focusedTeamId && !isFocused;
                                        
                                        return (`

**pages/public/WorkOrderConfirm.jsx**
- `new Date(lastReadTime))).length;

    const primaryColor = order?.org_primary_color || '#3b82f6'
    const orgTimezone = order?.org_timezone || 'Europe/Brussels'
    const canConfirm = checkedTerms && (!!signature || acceptedOffer) && !confirming

    if (loading) return (`
- `Powered by`
- `1 ? users.length : ''}`
- `0 && (`
- `)

    if (error && !order) return (`
- `Accepté en ligne`
- `Spacer`
- `www.getapp.ro`
- `(sans signature manuscrite)`
- `0 ? (`
- `prev`
- `)

    return (`

**pages/public/QuoteCalculator.jsx**
- `);
        for (let i = 1; i`
- `= minS && s`
- `));
        for (let i = 0; i`
- `);
    };

    if (loading) return (`
- `);

    return (`
- `0 && (`

**pages/public/legal/PrivacyPage.jsx**
- `Les données traitées via l'application incluent :`
- `6. Vos Droits (RGPD)`
- `Sous-traitant`
- `Données d'identification :`
- `Le traitement des données est fondé sur l'exécution du contrat de travail (Article 6.1.b du RGPD) et sur l'intérêt légitime de l'employeur (Article 6.1.f) pour :`
- `Droit d'accès et de rectification.`
- `Le Sous-traitant conserve les données personnelles tant que le contrat avec le Responsable de Traitement est actif. Les données de géolocalisation détaillées sont conservées selon les prescriptions de l'Autorité de protection des données (généralement 2 mois maximum pour les détails de trajets de flotte, sauf justification légale). Les données comptables et de pointage peuvent être conservées jusqu'à 5 ans conformément à la législation fiscale et sociale belge.`
- `Pour exercer ces droits, vous devez vous adresser directement à votre employeur (le Responsable de Traitement), qui transmettra votre requête au Prestataire le cas échéant. Vous avez également le droit d'introduire une réclamation auprès de l'Autorité de protection des données belge (APD) à l'adresse`
- `Le calcul et la gestion des heures de travail et de la paie.`
- `5. Sécurité et Sous-traitance Ultérieure`
- `4. Durée de Conservation des Données`
- `Responsable de Traitement`
- `Position GPS de l'appareil utilisé lors de l'activation du pointage ou des trajets logistiques.`
- `Droit à l'effacement ("droit à l'oubli") ou à la limitation du traitement, sous réserve des obligations légales de conservation de votre employeur.`
- `contact@apd-gba.be`
- `Retour à l'accueil`
- `Politique de Confidentialité`
- `3. Finalités et Base Légale`
- `Numéro d'entreprise (BCE) : 0785.292.895`
- `Responsable de Traitement :`
- `Horaires de travail, affectations aux chantiers, documents administratifs (carte d'identité, permis).`
- `Le Prestataire met en œuvre des mesures de sécurité techniques et organisationnelles conformes aux standards de l'industrie (chiffrement, accès restreints) pour protéger les données. Les données sont hébergées au sein de l'Union Européenne. Le recours à des sous-traitants ultérieurs (ex. hébergeurs cloud) est régi par des accords stricts garantissant un niveau de protection équivalent.`
- `Nom, prénom, code employé, numéro de téléphone, adresse email, coordonnées.`
- `DAVIDE CHAPE`
- `Droit à la portabilité des données.`
- `L'optimisation des trajets et la gestion de la flotte de véhicules.`
- `Données professionnelles :`
- `Dans le cadre de l'utilisation de l'application SaaS par les employés, l'employeur (l'entreprise cliente) agit en qualité de`
- `En tant que personne concernée, vous disposez des droits suivants concernant vos données personnelles :`
- `Siège social : Gemeentehuisstraat 27 box 5, 1740 Ternat, Belgique`
- `La sécurité des employés et des équipements sur les chantiers.`
- `Données de géolocalisation :`
- `2. Données Personnelles Collectées`
- `au sens du Règlement Général sur la Protection des Données (RGPD). Le fournisseur de l'application (le Prestataire) agit en qualité de`
- `1. Identité du Responsable de Traitement`

**pages/public/legal/DpaPage.jsx**
- `Le Sous-traitant met en œuvre les mesures techniques et organisationnelles appropriées afin de garantir un niveau de sécurité adapté au risque (chiffrement des flux, cloisonnement des bases de données de chaque locataire/tenant, sauvegardes régulières).`
- `Billtobox`
- `1. Objet`
- `Prendre en compte les principes de protection des données dès la conception (Privacy by Design).`
- `Données d'état civil, données de contact, données de géolocalisation, données de connexion et d'horodatage.`
- `Sous-traitant / Prestataire SaaS :`
- `Hébergement, maintenance, gestion des accès et traitement algorithmique pour le pointage, la facturation et la géolocalisation des véhicules et employés.`
- `Veiller à ce que les personnes autorisées à traiter les données s'engagent à en respecter la confidentialité.`
- `Le Sous-traitant notifie au Responsable de Traitement toute violation de données à caractère personnel dans un délai maximum de 48 heures après en avoir pris connaissance, afin de permettre au Responsable de Traitement de respecter ses propres obligations de notification envers l'APD.`
- `4. Sous-traitance Ultérieure et Intégrations Tierces`
- `Registre du Commerce : J40/2825/2020`
- `Retour à l'accueil`
- `Le présent Accord de Traitement des Données (ci-après le "DPA") constitue une annexe aux Conditions Générales de Vente et d'Utilisation. Il a pour objet de définir les conditions dans lesquelles le Prestataire (le Sous-traitant) s'engage à effectuer, pour le compte de l'Entreprise cliente (le Responsable de Traitement), les opérations de traitement de données à caractère personnel définies ci-après.`
- `Le Responsable de Traitement autorise le Sous-traitant à faire appel à des sous-traitants ultérieurs pour l'hébergement (ex. fournisseurs cloud). De plus, l'application permet la transmission de données (telles que les factures et données clients) vers des services tiers connectés à la demande du Responsable de Traitement, comme`
- `Numéro d'identification (CUI) : 42322117`
- `5. Mesures de Sécurité`
- `Catégories de données :`
- `Siège social : Bucureşti sectorul 1, str. popa savu, nr.78, cod poștal 11434, Roumanie`
- `Traiter les données uniquement sur instruction documentée du Responsable de Traitement.`
- `Au terme de la prestation de services, le Sous-traitant s'engage, au choix du Responsable de Traitement, à détruire toutes les données à caractère personnel ou à les renvoyer, et à détruire les copies existantes, sauf si la législation de l'Union ou d'un État membre exige la conservation de ces données.`
- `Nature et finalité :`
- `Le Sous-traitant s'engage à :`
- `Employés et collaborateurs du Responsable de Traitement.`
- `Catégories de personnes concernées :`
- `6. Notification des Violations de Données`
- `2. Description du Traitement`
- `Garantir la confidentialité des données à caractère personnel traitées.`
- `pour la gestion comptable. Ce transfert s'effectue sous la responsabilité exclusive du Responsable de Traitement.`
- `3. Obligations du Sous-traitant`
- `TRADE INVEST NETWORK S.R.L.`
- `Accord de Traitement des Données (DPA)`
- `7. Sort des Données`

**pages/public/legal/TermsPage.jsx**
- `La responsabilité du Prestataire est strictement limitée aux dommages directs, prouvés par le Client. Le Prestataire ne pourra en aucun cas être tenu responsable des dommages indirects, incluant mais sans s'y limiter, la perte de données, de chiffre d'affaires, ou de réputation. Le montant cumulé des dommages-intérêts est limité au montant payé par le Client lors des 12 derniers mois.`
- `8. Résiliation`
- `3. Obligations et Responsabilités du Client`
- `Tous les éléments techniques, graphiques, textuels et l'architecture du Service sont la propriété exclusive du Prestataire. Toute reproduction, modification ou ingénierie inverse est strictement interdite. Le Client conserve l'entière propriété des données métier intégrées dans le Service.`
- `Éditeur du Service / Prestataire :`
- `Registre du Commerce : J40/2825/2020`
- `Retour à l'accueil`
- `2. Description du Service`
- `Les présentes Conditions Générales de Vente et d'Utilisation (ci-après les "CGV/CGU") régissent l'accès et l'utilisation de l'application SaaS (le "Service") éditée par le Prestataire. Elles constituent un contrat juridiquement contraignant entre le Prestataire et l'Entreprise cliente (le "Client"). En accédant au Service, le Client accepte expressément et sans réserve les présentes CGV/CGU.`
- `1. Préambule et Champ d'Application`
- `Le Service propose une fonctionnalité de suivi de la géolocalisation pour des fins légitimes de gestion logistique, de sécurité et d'optimisation des trajets. Le Client, en tant que Responsable de Traitement, s'engage expressément à informer ses employés et à obtenir leur consentement ou à baser ce traitement sur un fondement légal approprié en vertu du RGPD et des avis de l'Autorité de protection des données (APD) belge.`
- `Numéro d'identification (CUI) : 42322117`
- `7. Limitation de Responsabilité`
- `Conditions Générales de Vente et d'Utilisation (CGV/CGU)`
- `Siège social : Bucureşti sectorul 1, str. popa savu, nr.78, cod poștal 11434, Roumanie`
- `4. Utilisation de la Géolocalisation (GPS)`
- `Le contrat peut être résilié par l'une des parties en cas de manquement grave aux obligations contractuelles, non réparé dans les 30 jours suivant la notification. À l'issue du contrat, l'accès au Service sera révoqué et le Client pourra demander l'exportation ou la destruction de ses données.`
- `6. Propriété Intellectuelle`
- `L'accès au Service s'effectue via des identifiants stricts. Le Client s'engage à garantir la confidentialité de ces identifiants. Le Client est l'unique responsable des données saisies dans la plateforme et de leur conformité avec la législation applicable (notamment le droit du travail belge et le RGPD).`
- `Le Prestataire s'engage à mettre en œuvre tous les moyens raisonnables pour assurer une disponibilité du Service à 99% du temps. Des interruptions temporaires pour maintenance peuvent survenir et seront, dans la mesure du possible, communiquées à l'avance. Le Prestataire ne saurait être tenu responsable d'une perte d'exploitation liée à une indisponibilité temporaire.`
- `Le Service est une solution logicielle B2B destinée à la gestion logistique, au pointage du temps de travail, au suivi des chantiers et à la gestion de flotte. Le Prestataire concède au Client un droit d'utilisation non exclusif, non transférable et mondial pour la durée du contrat.`
- `5. Disponibilité du Service et SLA`
- `Les présentes CGV/CGU sont régies par le droit belge. En cas de litige qui ne pourrait être résolu à l'amiable, les tribunaux de l'arrondissement judiciaire du siège social du Prestataire seront seuls compétents.`
- `9. Droit Applicable et Juridiction Compétente`
- `TRADE INVEST NETWORK S.R.L.`

**pages/employee/TimesheetForm.jsx**
- `}
                            Salvează Draft`
- `Data`
- `}
                            Trimite spre Aprobare`
- `Intrare`
- `Notițe (opțional)`
- `Șantier`
- `Ieșire`
- `Informații Generale`
- `Adaugă Activitate`

**pages/employee/SiteManagerPanel.jsx**
- `)
    }

    return (`
- `sum + getLiveHours(m), 0))}`
- `m.check_out_time && !m.is_on_break).length
                    const isExpanded = expandedTeams[team.id]

                    return (`
- `0 &&`
- `0 ? (`
- `)
        }
        return (`
- `0 && (`

**pages/employee/EmployeeMaterialRequests.jsx**
- `Răspuns`
- `Solicită Preluarea`
- `Anulează`
- `Materiale Vizate`
- `Scule pe acest șantier`
- `Semnează Primirea`
- `Cerere Nouă`
- `0 && (`
- `Alte Materiale (Opțional)`
- `Notițe (Opțional)`
- `Șantier Destinație (Dacă nu ești pontat)`
- `Istoric Cereri`
- `Administratorul a predat următoarea solicitare către șantier. Te rugăm să confirmi că ai intrat în posesia ei.`
- `Refuz (Nu am primit)`
- `Prima cerere`
- `0
                                                        const qty = selectedItems[item.id] || 0
                                                        return (`
- `) : requests.length === 0 ? (`
- `(Șantierul curent automat)`
- `Nu ai trimis cereri de materiale.`
- `Selectează din Magazie`
- `}
                                        Trimite`
- `Confirm Primirea`

**pages/employee/ClockInPage.jsx**
- `)
    }

    return (`
- `80 && (`
- `Am Înțeles`
- `Adaugă`
- `, dar timpul tău va fi calculat automat începând cu ora`
- `Te-ai pontat mai devreme cu succes. Ești`
- `) : activeTab === 'comenzi' ? (`
- `0 ? (
                                /* Break already taken - show history */`
- `0) && (`
- `) : hadPreviousShift ? (
                        /* Shift completed today — show summary */`
- `OK, Am înțeles`
- `Da, închei`
- `OK`
- `Anulează`
- `Încearcă din nou`
- `Avizier Important`
- `0 ? (`
- `0 && (`

**pages/employee/WorkerOrdersPage.jsx**
- `Enregistrer la consommation`
- `Sugestie Stație Sable`
- `)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER: DETALIU comanda
    // ─────────────────────────────────────────────────────────────────────────
    return (`
- `p.photo_type === 'internal')
    const fileRef = useRef(null)

    return (`
- `Surface coulée réelle (m²)`
- `Surface coulée (m²)`
- `l.trim())
        .filter(Boolean)

    return (`
- `✅ Vérifié par IA:`
- `);
                            }
                            return null;
                        })()}`
- `internes`
- `L'admin enverra le lien de signature au client.`
- `Google`
- `Waze`
- `s.to === 'Baza').km).toFixed(1)} km`
- `) : tenant?.logo_url ? (`
- `Ajouter du matériel`
- `Vérification clôture commande`
- `Cette section est disponible`
- `Enregistré`
- `Anulare`
- `0 && (`
- `Les photos ajoutées ici sont`
- `Cea Recomandată`
- `Épaisseur réelle (cm)`
- `= order.min_photos_required ?`
- `Quantité de sable réelle (kg)`
- `0 || durmitePlastic || durmiteMetalic) && (`
- `Metalic (Plasă)`
- `Quantité de sable (m³)`
- `Annuler la finalisation`
- `. Elles n'apparaissent pas dans le lien client.`
- `Sable (Nécessaire estimé)`
- `Confirmă`
- `: saving ? 'Enregistrement...' :`
- `uniquement au chef d'équipe.`
- `Analyse en cours...`
- `Plastic (Duramint)`
- `) : order.site_address ? (`
- `Photo écran machine`
- `s.to === 'Baza') && (`
- `Ré-analyser photo par IA`
- `0 ?`
- `Apple`
- `Quantité de sable (kg)`
- `Quantité de ciment (kg)`
- `Commande finalisée`
- `Necesar Sable (estimat)`
- `Photos de finalisation requises :`

**pages/employee/EmployeeWorkOrdersPanel.jsx**
- `Viitoare (Robaws)`
- `0 ? (`
- `)
                                    ) : (
                                        /* EDIT MODE */`
- `0 && (`

**pages/employee/EmployeeFleetMap.jsx**
- ``;
  const chapeSvg = ``
- ``;
  const mixerSvg = ``
- `) : (
                          v.vehicle_type === 'Grue' ? (`
- `Stations de Sable`
- ``;
  const camionGrueSvg = ``
- ``;

  let selectedSvg = truckSvg;
  if (vType.includes('chape')) selectedSvg = chapeSvg;
  else if (vType.includes('beton') || vType.includes('toupie')) selectedSvg = mixerSvg;
  else if (vType.includes('grue') && vType.includes('camion')) selectedSvg = camionGrueSvg;
  else if (vType.includes('grue')) selectedSvg = craneSvg;

  const innerHtml = fullAvatarUrl 
    ? ``
- `-- km`
- `0 &&`
- ``;
  const craneSvg = ``
- `0 && !isMapFull && (`
- `Naviguer`

**pages/employee/EmployeeEmergencies.jsx**
- `Descrierea Problemei *`
- `Urgent`
- `}
                                    Trimite Urgență`
- `Nivel Severitate`
- `Anulează`
- `Raportează`
- `CRITIC`
- `) : emergencies.length === 0 ? (`
- `CRITIC / PERICOL MAJOR`
- `Nu ai nicio urgență raportată.`
- `Răspuns Admin`
- `Raportează o Urgență`

**pages/employee/TeamLeaderPanel.jsx**
- `Status Live`
- `0 || m.break_start_time) && (`
- `— în curs...`
- `)
            default:
                return (`
- `Absent`
- `Aprobat`
- `Terminat`
- `)
    }

    const team = teams[0]

    return (`
- `Timp șantier`
- `)
            case 'on_break':
                return (`
- `0 &&`
- `0 && (`
- `)
            case 'finished':
                return (`

**pages/employee/EmployeeInventory.jsx**
- `}
                                                        Raportează Defect`
- `}
                                                    Retur`
- `Nu ai scule sau materiale atribuite pe numele tău.`
- `Raportează Defect`
- `✓ Confirm Primirea`
- `La mine`
- `Anulează`
- `Returnezi scula?`
- `Materiale Vizate`
- `c.category === 'COMBUSTIBIL').length}`
- `}
                                                        Returnează`
- `Trimite Refuz`
- `Înapoi`
- `Semnează Primirea`
- `) : item.is_defective ? (`
- `Opțional — descrie ce lipsea sau de ce refuzi.`
- `) : inventory.length === 0 ? (`
- `Confirmă Retur`
- `Inventar Gol`
- `Administratorul a predat următoarea solicitare. Confirmă că ai intrat în posesia ei.`
- `: 'Confirmă'}`
- `Predarea a fost trimisă.`
- `0 && (`
- `Sculele Mele`
- `Consumabile & Materiale`
- `Disponibil:`
- `Raportează Consum`
- `Notițe (Opțional)`
- `Defect`
- `Raportez Defect`
- `!i.inventory_code)

    return (`
- `Motivul Refuzului`
- `Descrie defectul (opțional)`
- `Refuz (Nu am primit)`
- `" va fi marcată ca returnată în magazie.`
- `Da, Returnez`
- `Combustibil`
- `Adminul trebuie să confirme primirea sculei.`
- `c.category !== 'COMBUSTIBIL').length}`
- `⏳ Așteptare admin`
- `Consum`
- `Inventarul Meu`

**pages/employee/TimesheetsPage.jsx**
- `Pontajele Mele`
- `) : timesheets.length === 0 ? (`
- `Nu ai pontaje`
- `)
    }

    return (`
- `Creează Pontaj`
- `Pontaj Nou`

**pages/employee/EmployeeComplaints.jsx**
- `Subiect *`
- `Sesizare Nouă`
- `}
                                    Trimite`
- `Nu ai sesizări trimise.`
- `Prima sesizare`
- `Anulează`
- `) : complaints.length === 0 ? (`
- `Răspuns Admin`
- `Descriere *`

## Backend (Emails) Hardcoded Strings
**api/admin_emails.py**

**services/pdf_generator.py**

