<?php
/**
 * Created by PhpStorm.
 * User: krun
 * Date: 08.01.14
 * Time: 12:29
 */

namespace Hexmedia\AdministratorBundle\EventListener;


use Symfony\Component\HttpFoundation\Session\Session;
use Symfony\Component\HttpKernel\Event\GetResponseEvent;
use Symfony\Component\HttpKernel\HttpKernelInterface;

class LanguageListener
{
    private $session;

    public function __construct(Session $session)
    {
        $this->session = $session;
    }

    public function setLocale(GetResponseEvent $event)
    {
        if (HttpKernelInterface::MASTER_REQUEST !== $event->getRequestType()) {
            return;
        }

        $request = $event->getRequest();

        if ($this->session->get('locale')) {
            $request->setLocale($this->session->get("locale"));
        } else {
            //FIXME: This locale should be downloaded from configuration
            $request->setLocale($request->getPreferredLanguage(array('en', 'pl')));
        }

    }
} 